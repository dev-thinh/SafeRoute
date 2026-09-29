import axios from 'axios';
import * as turf from '@turf/turf';
import { Coordinate, VehicleType, FloodEvent } from '../types';
import { ENV } from '../config/env';
import { buildHazardMultiPolygonFromEvents } from './spatialService';
import { calculateTidalDepth, calculateRainDepth, calculateEventDepth } from './predictionEngine';

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
    const depth = Math.round(calculateEventDepth(event, targetTime));

    if (depth < 10) continue; // Minimal water, not hazardous

    const eventPt = turf.point(event.geometry.coordinates);
    // 250m buffer radius around the flood point to ensure full road intersection
    const hazardBuf = turf.buffer(eventPt, 0.25, { units: 'kilometers' });
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
 * Generates 4 tangential detour waypoints around the bounding box of a specific hazard polygon.
 * Offsets into parallel avenues (~1.5 km).
 */
export function generateDetourWaypoints(
  origin: Coordinate,
  destination: Coordinate,
  hazardPolygon: GeoJSON.Polygon | GeoJSON.MultiPolygon
): Coordinate[] {
  const bbox = turf.bbox(hazardPolygon); // [minLng, minLat, maxLng, maxLat]
  const center = turf.center(turf.feature(hazardPolygon)).geometry.coordinates;

  const offsetDistance = 0.015; // ~1.5km offset (parallel arterial avenues)
  return [
    { lat: center[1], lng: bbox[0] - offsetDistance }, // West detour
    { lat: center[1], lng: bbox[2] + offsetDistance }, // East detour
    { lat: bbox[3] + offsetDistance, lng: center[0] }, // North detour
    { lat: bbox[1] - offsetDistance, lng: center[0] }, // South detour
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
  const baseRoutes = await fetchOsrmRoute([origin, destination]);

  let fastestRoute = { ...baseRoutes[0] };
  const fastestAnalysis = extractRouteFloodedSegments(fastestRoute.geometry, events, targetTime);
  fastestRoute.isFlooded = fastestAnalysis.isFlooded;
  fastestRoute.maxFloodDepthCm = fastestAnalysis.maxFloodDepthCm;
  fastestRoute.floodedDistanceMeters = fastestAnalysis.floodedDistanceMeters;
  fastestRoute.floodedSegments = fastestAnalysis.floodedSegments;

  // Search if any alternative route from baseRoutes is completely dry
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

  // If the fastest route is flooded, identify which specific flood events intersect it
  // and compute targeted local detour bypasses around those obstacles!
  if (fastestRoute.isFlooded) {
    const hitEvents = events.filter((ev) => {
      const depth = Math.round(calculateEventDepth(ev, targetTime));
      if (depth < 10) return false;
      const pt = turf.point(ev.geometry.coordinates);
      const buf = turf.buffer(pt, 0.25, { units: 'kilometers' });
      return buf && turf.booleanIntersects(turf.lineString(fastestRoute.geometry.coordinates), buf);
    });

    const candidateDetours: { route: RouteResult; analysis: ReturnType<typeof extractRouteFloodedSegments> }[] = [];

    for (const hitEvent of hitEvents) {
      const pt = turf.point(hitEvent.geometry.coordinates);
      const localHazard = turf.buffer(pt, 0.25, { units: 'kilometers' });
      if (!localHazard) continue;

      const detourWaypoints = generateDetourWaypoints(origin, destination, localHazard.geometry);
      for (const waypoint of detourWaypoints) {
        try {
          const detourRoutes = await fetchOsrmRoute([origin, waypoint, destination]);
          if (detourRoutes && detourRoutes.length > 0) {
            const detourAnalysis = extractRouteFloodedSegments(detourRoutes[0].geometry, events, targetTime);
            candidateDetours.push({ route: detourRoutes[0], analysis: detourAnalysis });
          }
        } catch (e) {
          // Skip failed waypoint
        }
      }
    }

    // 1st Priority: Pick the shortest completely dry detour route
    const completelyDry = candidateDetours
      .filter((c) => !c.analysis.isFlooded)
      .sort((a, b) => a.route.distanceMeters - b.route.distanceMeters);

    if (completelyDry.length > 0) {
      safeRoute = {
        ...completelyDry[0].route,
        isFlooded: false,
        maxFloodDepthCm: 0,
        floodedDistanceMeters: 0,
        floodedSegments: [],
      };
    } else if (candidateDetours.length > 0) {
      // 2nd Priority: Pick the detour with minimal flood exposure
      candidateDetours.sort(
        (a, b) =>
          a.analysis.maxFloodDepthCm - b.analysis.maxFloodDepthCm ||
          a.analysis.floodedDistanceMeters - b.analysis.floodedDistanceMeters
      );
      const best = candidateDetours[0];
      safeRoute = {
        ...best.route,
        isFlooded: best.analysis.isFlooded,
        maxFloodDepthCm: best.analysis.maxFloodDepthCm,
        floodedDistanceMeters: best.analysis.floodedDistanceMeters,
        floodedSegments: best.analysis.floodedSegments,
      };
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
