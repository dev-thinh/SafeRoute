import axios from 'axios';
import * as turf from '@turf/turf';
import { Coordinate, VehicleType, FloodEvent } from '../types';
import { ENV, VEHICLE_THRESHOLDS } from '../config/env';
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
 * Calculates realistic travel duration in urban Vietnam.
 * Motorbikes: ~32 km/h (8.89 m/s) navigating traffic and filtering through lanes.
 * Cars: ~20 km/h (5.56 m/s) due to urban congestion, traffic light phases, and lane restrictions.
 */
export function calculateVehicleDuration(distanceMeters: number, vehicleType: VehicleType = 'motorbike'): number {
  const speedMps = vehicleType === 'motorbike' ? (32 * 1000) / 3600 : (20 * 1000) / 3600;
  return Math.max(60, Math.round(distanceMeters / speedMps));
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
 * Severity levels adjust according to vehicle type clearance:
 * Motorbike:
 * - low (<= 15cm): Yellow
 * - medium (16 - 20cm): Orange (warning threshold)
 * - high (21 - 30cm): Red (exceeds avoid threshold)
 * - prohibited (> 30cm): Dark Red
 * Car:
 * - low (<= 20cm): Yellow
 * - medium (21 - 30cm): Orange
 * - high (31 - 40cm): Red (warning & avoid threshold)
 * - prohibited (> 40cm): Dark Red
 */
export function extractRouteFloodedSegments(
  routeGeometry: GeoJSON.LineString,
  events: FloodEvent[],
  targetTime: Date,
  vehicleType: VehicleType = 'motorbike'
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
  const threshold = VEHICLE_THRESHOLDS[vehicleType] || VEHICLE_THRESHOLDS.motorbike;

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
        if (vehicleType === 'motorbike') {
          if (depth <= 15) severity = 'low';
          else if (depth <= 20) severity = 'medium';
          else if (depth <= 30) severity = 'high';
          else severity = 'prohibited';
        } else {
          // Car
          if (depth <= 20) severity = 'low';
          else if (depth <= 30) severity = 'medium';
          else if (depth <= 40) severity = 'high';
          else severity = 'prohibited';
        }

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

  // A route is hazardous for the chosen vehicle if water depth meets or exceeds vehicle avoid threshold
  const hasVehicleHazard = maxDepth >= threshold.avoid;

  return {
    isFlooded: hasVehicleHazard,
    maxFloodDepthCm: maxDepth,
    floodedDistanceMeters: Math.round(totalDistance),
    floodedSegments,
  };
}

/**
 * Generates 4 tangential detour waypoints around the bounding box of a specific hazard polygon.
 * Offsets into parallel avenues tailored to the vehicle profile:
 * - Motorbike: ~500m (0.005 deg) for tight local parallel street bypasses
 * - Car: ~1.6km (0.016 deg) for wide arterial boulevards and dual carriageways
 */
export function generateDetourWaypoints(
  origin: Coordinate,
  destination: Coordinate,
  hazardPolygon: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  vehicleType: VehicleType = 'motorbike'
): Coordinate[] {
  const bbox = turf.bbox(hazardPolygon); // [minLng, minLat, maxLng, maxLat]
  const center = turf.center(turf.feature(hazardPolygon)).geometry.coordinates;

  const offsetDistance = vehicleType === 'motorbike' ? 0.005 : 0.016;
  return [
    { lat: center[1], lng: bbox[0] - offsetDistance }, // West detour
    { lat: center[1], lng: bbox[2] + offsetDistance }, // East detour
    { lat: bbox[3] + offsetDistance, lng: center[0] }, // North detour
    { lat: bbox[1] - offsetDistance, lng: center[0] }, // South detour
  ];
}

/**
 * Calls OSRM API to fetch directions between coordinates with vehicle-specific speed calculation.
 */
export async function fetchOsrmRoute(
  coordinates: Coordinate[],
  vehicleType: VehicleType = 'motorbike'
): Promise<RouteResult[]> {
  const coordString = coordinates.map((c) => `${c.lng},${c.lat}`).join(';');
  const url = `${ENV.OSRM_URL}/route/v1/driving/${coordString}?alternatives=true&geometries=geojson&overview=full`;

  try {
    const response = await axios.get(url, { timeout: 6000 });
    if (!response.data || !response.data.routes || response.data.routes.length === 0) {
      throw new Error('No route found from OSRM');
    }

    return response.data.routes.map((r: any) => ({
      distanceMeters: Math.round(r.distance),
      durationSeconds: calculateVehicleDuration(r.distance, vehicleType),
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
        durationSeconds: calculateVehicleDuration(5000, vehicleType),
        isFlooded: false,
        maxFloodDepthCm: 0,
        floodedDistanceMeters: 0,
        geometry: straightLine,
      },
    ];
  }
}

/**
 * Computes both the safe route and the fastest route avoiding active flood zones,
 * taking into account vehicle type (motorbike vs car) for speed, corridors, and clearance.
 */
export async function navigateSafeRoute(
  origin: Coordinate,
  destination: Coordinate,
  targetTime: Date,
  vehicleType: VehicleType,
  events: FloodEvent[]
): Promise<{ safeRoute: RouteResult; fastestRoute: RouteResult }> {
  // 1. Fetch base routes from OSRM
  const baseRoutes = await fetchOsrmRoute([origin, destination], vehicleType);
  const candidatePool: RouteResult[] = [...baseRoutes];

  // 2. Discover vehicle-tailored corridor alternatives
  // Motorbikes can exploit local urban shortcuts; cars prioritize arterial boulevards.
  const p1 = turf.point([origin.lng, origin.lat]);
  const p2 = turf.point([destination.lng, destination.lat]);
  const directDistKm = turf.distance(p1, p2, { units: 'kilometers' });

  if (directDistKm >= 1.2) {
    const mid = turf.midpoint(p1, p2);
    const bearing = turf.bearing(p1, p2);
    const corridorOffsetKm = vehicleType === 'motorbike' ? 0.6 : 1.6;

    const leftPt = turf.destination(mid, corridorOffsetKm, bearing - 90, { units: 'kilometers' }).geometry.coordinates;
    const rightPt = turf.destination(mid, corridorOffsetKm, bearing + 90, { units: 'kilometers' }).geometry.coordinates;

    const corridorWaypoints: Coordinate[] = [
      { lng: leftPt[0], lat: leftPt[1] },
      { lng: rightPt[0], lat: rightPt[1] },
    ];

    for (const way of corridorWaypoints) {
      try {
        const extraRoutes = await fetchOsrmRoute([origin, way, destination], vehicleType);
        if (extraRoutes.length > 0) {
          candidatePool.push(extraRoutes[0]);
        }
      } catch (e) {
        // Skip inaccessible corridor waypoint
      }
    }
  }

  // 3. Evaluate each candidate against flood events using vehicle clearance thresholds
  const evaluatedCandidates = candidatePool.map((c) => {
    const analysis = extractRouteFloodedSegments(c.geometry, events, targetTime, vehicleType);
    return {
      route: {
        ...c,
        isFlooded: analysis.isFlooded,
        maxFloodDepthCm: analysis.maxFloodDepthCm,
        floodedDistanceMeters: analysis.floodedDistanceMeters,
        floodedSegments: analysis.floodedSegments,
      },
      analysis,
    };
  });

  // Fastest route is the one with the lowest travel duration
  evaluatedCandidates.sort((a, b) => a.route.durationSeconds - b.route.durationSeconds);
  const fastestCandidate = evaluatedCandidates[0];
  const fastestRoute: RouteResult = { ...fastestCandidate.route };

  // 4. Safe route determination:
  // First, check if any candidate in the pool is completely dry for this vehicle
  const dryCandidates = evaluatedCandidates.filter((c) => !c.analysis.isFlooded);

  let safeRoute: RouteResult | null = null;

  // If the fastest route is flooded for this vehicle, compute targeted detour bypasses around the obstacles
  if (fastestRoute.isFlooded) {
    const hitEvents = events.filter((ev) => {
      const depth = Math.round(calculateEventDepth(ev, targetTime));
      if (depth < (VEHICLE_THRESHOLDS[vehicleType]?.avoid || 20)) return false;
      const pt = turf.point(ev.geometry.coordinates);
      const buf = turf.buffer(pt, 0.25, { units: 'kilometers' });
      return buf && turf.booleanIntersects(turf.lineString(fastestRoute.geometry.coordinates), buf);
    });

    const candidateDetours: { route: RouteResult; analysis: ReturnType<typeof extractRouteFloodedSegments> }[] = [];

    for (const hitEvent of hitEvents) {
      const pt = turf.point(hitEvent.geometry.coordinates);
      const localHazard = turf.buffer(pt, 0.25, { units: 'kilometers' });
      if (!localHazard) continue;

      const detourWaypoints = generateDetourWaypoints(origin, destination, localHazard.geometry, vehicleType);
      for (const waypoint of detourWaypoints) {
        try {
          const detourRoutes = await fetchOsrmRoute([origin, waypoint, destination], vehicleType);
          if (detourRoutes && detourRoutes.length > 0) {
            const detourAnalysis = extractRouteFloodedSegments(detourRoutes[0].geometry, events, targetTime, vehicleType);
            candidateDetours.push({
              route: {
                ...detourRoutes[0],
                isFlooded: detourAnalysis.isFlooded,
                maxFloodDepthCm: detourAnalysis.maxFloodDepthCm,
                floodedDistanceMeters: detourAnalysis.floodedDistanceMeters,
                floodedSegments: detourAnalysis.floodedSegments,
              },
              analysis: detourAnalysis,
            });
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
      safeRoute = completelyDry[0].route;
    } else if (dryCandidates.length > 0) {
      // 2nd Priority: Pick from dry corridor candidates
      dryCandidates.sort((a, b) => a.route.durationSeconds - b.route.durationSeconds);
      safeRoute = dryCandidates[0].route;
    } else if (candidateDetours.length > 0) {
      // 3rd Priority: Pick the detour with minimal flood exposure
      candidateDetours.sort(
        (a, b) =>
          a.analysis.maxFloodDepthCm - b.analysis.maxFloodDepthCm ||
          a.analysis.floodedDistanceMeters - b.analysis.floodedDistanceMeters
      );
      safeRoute = candidateDetours[0].route;
    }
  } else {
    // Fastest route is not flooded.
    // If there is an alternative dry corridor with different geometry, use it as the secondary route option
    if (dryCandidates.length > 1) {
      const alternative = dryCandidates.find(
        (c) => Math.abs(c.route.distanceMeters - fastestRoute.distanceMeters) > 80
      );
      if (alternative) {
        safeRoute = alternative.route;
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
