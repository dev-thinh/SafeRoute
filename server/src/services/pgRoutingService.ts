import * as turf from '@turf/turf';
import { pool } from '../db/pool';
import { Coordinate, VehicleType, FloodEvent, RouteResult } from '../types';
import { VEHICLE_THRESHOLDS } from '../config/env';
import { calculateEventDepth } from './predictionEngine';
import {
  calculateVehicleDuration,
  extractRouteFloodedSegments,
  FLOOD_HAZARD_RADIUS_KM,
  stripRawEndpointConnectors,
} from './routingEngine';

interface VertexResult {
  id: string;
  distMeters: number;
}

/**
 * Finds the nearest road network vertex in ways_vertices_pgr.
 * If the distance is > 4000m, the point is outside the Saigon network boundaries.
 */
export async function findNearestVertex(coord: Coordinate): Promise<VertexResult | null> {
  const res = await pool.query(
    `SELECT id, ST_Distance(geom, ST_SetSRID(ST_Point($1, $2), 4326), true) AS dist_meters
     FROM ways_vertices_pgr
     ORDER BY geom <-> ST_SetSRID(ST_Point($1, $2), 4326)
     LIMIT 1;`,
    [coord.lng, coord.lat]
  );

  if (res.rows.length === 0) return null;
  const dist = parseFloat(res.rows[0].dist_meters);
  if (dist > 4000) return null; // Outside Saigon coverage

  return {
    id: res.rows[0].id,
    distMeters: dist,
  };
}

/**
 * Reconstructs continuous GeoJSON LineString coordinates from pgr_dijkstra edge steps.
 */
function reconstructGeometry(
  origin: Coordinate,
  destination: Coordinate,
  rows: any[]
): { coordinates: [number, number][]; totalDistanceMeters: number } {
  const allCoords: [number, number][] = [[origin.lng, origin.lat]];
  let totalDist = 0;

  for (const row of rows) {
    if (!row.geom_json) continue;
    totalDist += parseFloat(row.length_m || '0');
    const geom = JSON.parse(row.geom_json);
    let coords: [number, number][] = geom.coordinates;

    // Orient line direction: if node at step matches target, edge was traversed backwards
    if (row.node === row.target) {
      coords = [...coords].reverse();
    }

    for (const pt of coords) {
      const last = allCoords[allCoords.length - 1];
      if (!last || Math.hypot(last[0] - pt[0], last[1] - pt[1]) > 0.000005) {
        allCoords.push(pt);
      }
    }
  }

  allCoords.push([destination.lng, destination.lat]);

  return {
    coordinates: allCoords,
    totalDistanceMeters: Math.round(totalDist),
  };
}

/**
 * Executes pgr_dijkstra with optional blocked edge IDs (cost = -1) or heavy penalty.
 */
async function executeDijkstra(
  startNode: string,
  endNode: string,
  blockedEdgeIds: string[] = [],
  penalizeInsteadOfBlock: boolean = false
): Promise<any[]> {
  let costExpression = 'cost_s AS cost, reverse_cost_s AS reverse_cost';

  if (blockedEdgeIds.length > 0) {
    const idList = blockedEdgeIds.join(',');
    if (penalizeInsteadOfBlock) {
      costExpression = `
        CASE WHEN id = ANY(ARRAY[${idList}]::bigint[]) THEN cost_s * 100 ELSE cost_s END AS cost,
        CASE WHEN id = ANY(ARRAY[${idList}]::bigint[]) THEN reverse_cost_s * 100 ELSE reverse_cost_s END AS reverse_cost
      `;
    } else {
      costExpression = `
        CASE WHEN id = ANY(ARRAY[${idList}]::bigint[]) THEN -1 ELSE cost_s END AS cost,
        CASE WHEN id = ANY(ARRAY[${idList}]::bigint[]) THEN -1 ELSE reverse_cost_s END AS reverse_cost
      `;
    }
  }

  const query = `
    SELECT d.seq, d.node, d.edge, d.cost, d.agg_cost, 
           w.source, w.target, w.name, w.length_m, 
           ST_AsGeoJSON(w.geom) AS geom_json
    FROM pgr_dijkstra(
      'SELECT id, source, target, ${costExpression} FROM ways',
      $1::bigint, $2::bigint, directed := true
    ) d
    JOIN ways w ON d.edge = w.id
    ORDER BY d.seq;
  `;

  const res = await pool.query(query, [startNode, endNode]);
  return res.rows;
}

/**
 * Finds flood-avoidance and fastest routes using local PostgreSQL pgRouting.
 * Returns null if origin or destination is outside the local network coverage.
 */
export async function findPgRoutingSafeRoute(
  origin: Coordinate,
  destination: Coordinate,
  targetTime: Date,
  vehicleType: VehicleType,
  events: FloodEvent[]
): Promise<{ safeRoute: RouteResult; fastestRoute: RouteResult } | null> {
  const [startVertex, endVertex] = await Promise.all([
    findNearestVertex(origin),
    findNearestVertex(destination),
  ]);

  if (!startVertex || !endVertex) {
    return null; // Fallback to external routing engine
  }

  // 1. Compute fastest route (standard road network costs)
  const fastRows = await executeDijkstra(startVertex.id, endVertex.id);
  if (fastRows.length === 0) {
    return null; // Disconnected graph or inaccessible
  }

  const fastRecon = reconstructGeometry(origin, destination, fastRows);
  const fastLineString: GeoJSON.LineString = {
    type: 'LineString',
    coordinates: fastRecon.coordinates,
  };
  const sanitizedFastLineString = stripRawEndpointConnectors(fastLineString, origin, destination);

  const fastAnalysis = extractRouteFloodedSegments(sanitizedFastLineString, events, targetTime, vehicleType);
  const fastestRoute: RouteResult = {
    distanceMeters: fastRecon.totalDistanceMeters,
    durationSeconds: calculateVehicleDuration(fastRecon.totalDistanceMeters, vehicleType),
    isFlooded: fastAnalysis.isFlooded,
    maxFloodDepthCm: fastAnalysis.maxFloodDepthCm,
    floodedDistanceMeters: fastAnalysis.floodedDistanceMeters,
    floodedSegments: fastAnalysis.floodedSegments,
    geometry: sanitizedFastLineString,
  };

  // If the fastest route is already dry, safe route is the fastest route
  if (!fastestRoute.isFlooded) {
    return {
      safeRoute: fastestRoute,
      fastestRoute,
    };
  }

  // 2. Identify road edges that intersect active flood hazard buffers
  const threshold = VEHICLE_THRESHOLDS[vehicleType] || VEHICLE_THRESHOLDS.motorbike;
  const activeHazardCoords: [number, number][] = [];

  for (const ev of events) {
    const depth = Math.round(calculateEventDepth(ev, targetTime));
    if (depth >= threshold.avoid) {
      activeHazardCoords.push(ev.geometry.coordinates);
    }
  }

  let safeRoute: RouteResult | null = null;

  if (activeHazardCoords.length > 0) {
    // Find all edge IDs within the hazard buffer (~80m = ~0.0008 deg)
    const pointsJson = JSON.stringify(activeHazardCoords);
    const edgeRes = await pool.query(
      `SELECT DISTINCT w.id 
       FROM ways w,
       json_array_elements($1::json) AS pt
       WHERE ST_DWithin(
         w.geom, 
         ST_SetSRID(ST_Point((pt->>0)::float8, (pt->>1)::float8), 4326), 
         $2
       );`,
      [pointsJson, FLOOD_HAZARD_RADIUS_KM / 100] // approx 0.0008 deg
    );

    const blockedEdgeIds = edgeRes.rows.map((r) => r.id);

    if (blockedEdgeIds.length > 0) {
      // Try strict block first (cost = -1)
      let safeRows = await executeDijkstra(startVertex.id, endVertex.id, blockedEdgeIds, false);

      // If strict block has no path (e.g. trapped on flooded street), fall back to penalty
      if (safeRows.length === 0) {
        safeRows = await executeDijkstra(startVertex.id, endVertex.id, blockedEdgeIds, true);
      }

      if (safeRows.length > 0) {
        const safeRecon = reconstructGeometry(origin, destination, safeRows);
        const safeLineString: GeoJSON.LineString = {
          type: 'LineString',
          coordinates: safeRecon.coordinates,
        };
        const sanitizedSafeLineString = stripRawEndpointConnectors(safeLineString, origin, destination);
        const safeAnalysis = extractRouteFloodedSegments(sanitizedSafeLineString, events, targetTime, vehicleType);
        safeRoute = {
          distanceMeters: safeRecon.totalDistanceMeters,
          durationSeconds: calculateVehicleDuration(safeRecon.totalDistanceMeters, vehicleType),
          isFlooded: safeAnalysis.isFlooded,
          maxFloodDepthCm: safeAnalysis.maxFloodDepthCm,
          floodedDistanceMeters: safeAnalysis.floodedDistanceMeters,
          floodedSegments: safeAnalysis.floodedSegments,
          geometry: sanitizedSafeLineString,
        };
      }
    }
  }

  if (!safeRoute) {
    safeRoute = fastestRoute;
  }

  return {
    safeRoute,
    fastestRoute,
  };
}
