import axios from 'axios';
import * as turf from '@turf/turf';
import { Coordinate, VehicleType, FloodEvent } from '../types';
import { ENV } from '../config/env';
import { buildHazardMultiPolygonFromEvents } from './spatialService';
import { calculateTidalDepth, calculateRainDepth } from './predictionEngine';

export interface FloodedSegment {
  coordinates: [number, number][]; // [[lng, lat], ...]
  depthCm: number;
  severity: 'low' | 'medium' | 'high' | 'prohibited'; // low: yellow, medium: orange, high: red, prohibited: dark red
  streetName?: string;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  isFlooded: boolean;
  maxFloodDepthCm: number;
  floodedDistanceMeters: number;
  geometry: GeoJSON.LineString;
  floodedSegments?: FloodedSegment[];
}

/**
 * Checks intersection and calculates flooded distance between a route LineString and a hazard polygon.
 */
export function evaluateRouteFloodExposure(
  routeGeometry: GeoJSON.LineString,
  hazardPolygon: GeoJSON.Polygon | GeoJSON.MultiPolygon | null
): { isFlooded: boolean; floodedDistanceMeters: number } {
  if (!hazardPolygon) {
    return { isFlooded: false, floodedDistanceMeters: 0 };
  }

  const routeFeature = turf.feature(routeGeometry);
  const hazardFeature = turf.feature(hazardPolygon);

  const intersects = turf.booleanIntersects(routeFeature, hazardFeature);
  if (!intersects) {
    return { isFlooded: false, floodedDistanceMeters: 0 };
  }

  // Calculate approximate overlapping length using bbox clipping or segment sampling
  const bbox = turf.bbox(hazardPolygon);
  const bboxPolygon = turf.bboxPolygon(bbox);
  const clipped = turf.lineSplit(routeFeature, bboxPolygon);

  let floodedDistance = 0;
  if (clipped && clipped.features.length > 0) {
    for (const segment of clipped.features) {
      const midPoint = turf.midpoint(
        turf.point(segment.geometry.coordinates[0]),
        turf.point(segment.geometry.coordinates[segment.geometry.coordinates.length - 1])
      );
      if (turf.booleanPointInPolygon(midPoint, hazardFeature)) {
        floodedDistance += turf.length(segment, { units: 'meters' });
      }
    }
  }

  return {
    isFlooded: true,
    floodedDistanceMeters: floodedDistance > 0 ? Math.round(floodedDistance) : 300,
  };
}

/**
 * Identifies and extracts precise flooded segments along a route line with their depth & severity levels.
 * Severity levels (Yellow -> Orange -> Red -> Dark Red / Prohibited):
 * - low (<= 15cm): Yellow
 * - medium (16 - 25cm): Orange
 * - high (26 - 35cm): Red
 * - prohibited (> 35cm): Dark Red
 */
export function extractRouteFloodedSegments(
  routeGeometry: GeoJSON.LineString,
  events: FloodEvent[],
  targetTime: Date
): {
  isFlooded: boolean;
  maxFloodDepthCm: number;
  floodedDistanceMeters: number;
  floodedSegments: FloodedSegment[];
} {
  const lineCoords = routeGeometry.coordinates;
  if (!lineCoords || lineCoords.length < 2) {
    return { isFlooded: false, maxFloodDepthCm: 0, floodedDistanceMeters: 0, floodedSegments: [] };
  }

  const floodedSegments: FloodedSegment[] = [];
  let maxDepth = 0;
  let totalDistance = 0;

  for (const event of events) {
    const depth = Math.round(
      event.cause === 'high_tide'
        ? calculateTidalDepth(event, targetTime)
        : calculateRainDepth(event, targetTime)
    );

    if (depth < 5) continue; // Minimal water, negligible impact

    const eventPt = turf.point(event.geometry.coordinates);
    // 150m buffer radius around the flood point
    const hazardBuf = turf.buffer(eventPt, 0.15, { units: 'kilometers' });
    if (!hazardBuf) continue;

    for (let i = 0; i < lineCoords.length - 1; i++) {
      const p1 = lineCoords[i] as [number, number];
      const p2 = lineCoords[i + 1] as [number, number];
      const segLine = turf.lineString([p1, p2]);

      if (turf.booleanIntersects(segLine, hazardBuf)) {
        maxDepth = Math.max(maxDepth, depth);
        const segDist = turf.length(segLine, { units: 'meters' });
        totalDistance += segDist;

        let severity: 'low' | 'medium' | 'high' | 'prohibited' = 'low';
        if (depth <= 15) severity = 'low';
        else if (depth <= 25) severity = 'medium';
        else if (depth <= 35) severity = 'high';
        else severity = 'prohibited';

        // Merge contiguous segments of matching severity
        const last = floodedSegments[floodedSegments.length - 1];
        if (
          last &&
          last.severity === severity &&
          last.coordinates.length > 0 &&
          last.coordinates[last.coordinates.length - 1][0] === p1[0] &&
          last.coordinates[last.coordinates.length - 1][1] === p1[1]
        ) {
          last.coordinates.push(p2);
        } else {
          floodedSegments.push({
            coordinates: [p1, p2],
            depthCm: depth,
            severity,
            streetName: event.streetName,
          });
        }
      }
    }
  }

  return {
    isFlooded: floodedSegments.length > 0,
    maxFloodDepthCm: maxDepth,
    floodedDistanceMeters: Math.round(totalDistance),
    floodedSegments,
  };
}

/**
 * Generates tangential detour waypoints around the bounding box of a hazard polygon.
 */
export function generateDetourWaypoints(
  origin: Coordinate,
  destination: Coordinate,
  hazardPolygon: GeoJSON.Polygon | GeoJSON.MultiPolygon
): Coordinate[] {
  const bbox = turf.bbox(hazardPolygon); // [minLng, minLat, maxLng, maxLat]
  const center = turf.center(turf.feature(hazardPolygon)).geometry.coordinates;

  const offsetDistance = 0.008; // ~800m offset
  return [
    { lat: center[1], lng: bbox[0] - offsetDistance }, // West detour
    { lat: center[1], lng: bbox[2] + offsetDistance }, // East detour
  ];
}

/**
 * Calls OSRM API to fetch directions between coordinates.
 */
export async function fetchOsrmRoute(coordinates: Coordinate[]): Promise<RouteResult[]> {
  const coordString = coordinates.map((c) => `${c.lng},${c.lat}`).join(';');
  const url = `${ENV.OSRM_URL}/route/v1/driving/${coordString}?alternatives=true&geometries=geojson&overview=full`;

  try {
    const response = await axios.get(url, { timeout: 6000 });
    if (!response.data || !response.data.routes || response.data.routes.length === 0) {
      throw new Error('No route found from OSRM');
    }

    return response.data.routes.map((r: any) => ({
      distanceMeters: Math.round(r.distance),
      durationSeconds: Math.round(r.duration),
      isFlooded: false,
      maxFloodDepthCm: 0,
      floodedDistanceMeters: 0,
      geometry: r.geometry,
    }));
  } catch (error) {
    // Fallback: Generate synthetic route points for resilience
    const straightLine: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: coordinates.map((c) => [c.lng, c.lat]),
    };
    return [
      {
        distanceMeters: 5000,
        durationSeconds: 600,
        isFlooded: false,
        maxFloodDepthCm: 0,
        floodedDistanceMeters: 0,
        geometry: straightLine,
      },
    ];
  }
}

/**
 * Computes both the safe route and the fastest route avoiding active flood zones.
 */
export async function navigateSafeRoute(
  origin: Coordinate,
  destination: Coordinate,
  targetTime: Date,
  vehicleType: VehicleType,
  events: FloodEvent[]
): Promise<{ safeRoute: RouteResult; fastestRoute: RouteResult }> {
  const hazardPolygon = buildHazardMultiPolygonFromEvents(events, targetTime, vehicleType);
  const baseRoutes = await fetchOsrmRoute([origin, destination]);

  let fastestRoute = { ...baseRoutes[0] };
  const fastestAnalysis = extractRouteFloodedSegments(fastestRoute.geometry, events, targetTime);
  fastestRoute.isFlooded = fastestAnalysis.isFlooded;
  fastestRoute.maxFloodDepthCm = fastestAnalysis.maxFloodDepthCm;
  fastestRoute.floodedDistanceMeters = fastestAnalysis.floodedDistanceMeters;
  fastestRoute.floodedSegments = fastestAnalysis.floodedSegments;

  // Search if any alternative route is dry
  let safeRoute: RouteResult | null = null;
  for (const candidate of baseRoutes) {
    const analysis = extractRouteFloodedSegments(candidate.geometry, events, targetTime);
    if (!analysis.isFlooded) {
      safeRoute = {
        ...candidate,
        isFlooded: false,
        maxFloodDepthCm: 0,
        floodedDistanceMeters: 0,
        floodedSegments: [],
      };
      break;
    }
  }

  // If all default alternatives cut through flood, calculate smart detour
  if (!safeRoute && hazardPolygon) {
    const detourWaypoints = generateDetourWaypoints(origin, destination, hazardPolygon);
    for (const waypoint of detourWaypoints) {
      const detourRoutes = await fetchOsrmRoute([origin, waypoint, destination]);
      const detourAnalysis = extractRouteFloodedSegments(detourRoutes[0].geometry, events, targetTime);
      if (!detourAnalysis.isFlooded) {
        safeRoute = {
          ...detourRoutes[0],
          isFlooded: false,
          maxFloodDepthCm: 0,
          floodedDistanceMeters: 0,
          floodedSegments: [],
        };
        break;
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
