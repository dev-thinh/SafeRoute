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
 * Detects whether an OSRM route contains a dead-end spur, U-turn, or cul-de-sac reversal.
 * Returns true if the route turns into a dead end, visits an alley, or backtracks.
 */
export function isRouteInvalidSpur(route: any): boolean {
  if (!route || !route.legs) return true;

  // 1. Explicit U-turn modifier in any step maneuver
  for (const leg of route.legs) {
    if (leg.steps) {
      for (const step of leg.steps) {
        if (step.maneuver && step.maneuver.modifier && step.maneuver.modifier.includes('u-turn')) {
          return true;
        }
      }
    }
  }

  // 2. Turnaround angle / dead-end check at intermediate waypoints
  if (route.legs.length >= 2) {
    for (let i = 0; i < route.legs.length - 1; i++) {
      const leg0 = route.legs[i];
      const leg1 = route.legs[i + 1];
      if (!leg0.steps || !leg1.steps || leg0.steps.length === 0 || leg1.steps.length === 0) continue;

      const lastStep0 = leg0.steps[leg0.steps.length - 1];
      const firstStep1 = leg1.steps[0];

      const arriveRoad = (leg0.steps[leg0.steps.length - 2]?.name || '').toLowerCase();
      const departRoad = (leg1.steps[1]?.name || leg1.steps[0]?.name || '').toLowerCase();

      // Reject routes entering narrow residential alleys (Hẻm / Ngõ / Kiệt / Ngách)
      if (
        arriveRoad.startsWith('hẻm') ||
        departRoad.startsWith('hẻm') ||
        arriveRoad.startsWith('ngõ') ||
        departRoad.startsWith('ngõ') ||
        arriveRoad.startsWith('kiệt') ||
        departRoad.startsWith('kiệt') ||
        arriveRoad.startsWith('ngách') ||
        departRoad.startsWith('ngách')
      ) {
        return true;
      }

      // Check turnaround angle (> 120° turnaround at waypoint)
      const bIn = lastStep0.maneuver.bearing_before;
      const bOut = firstStep1.maneuver.bearing_after;
      if (bIn !== undefined && bOut !== undefined) {
        let diff = Math.abs(bOut - bIn);
        if (diff > 180) diff = 360 - diff;
        if (diff > 120) {
          return true; // U-turn / dead-end reversal
        }
      }
    }
  }

  return false;
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
 */
export function generateDetourWaypoints(
  origin: Coordinate,
  destination: Coordinate,
  hazardPolygon: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  vehicleType: VehicleType = 'motorbike'
): Coordinate[] {
  const bbox = turf.bbox(hazardPolygon);
  const center = turf.center(turf.feature(hazardPolygon)).geometry.coordinates;

  const offsetDistance = vehicleType === 'motorbike' ? 0.005 : 0.016;
  return [
    { lat: center[1], lng: bbox[0] - offsetDistance },
    { lat: center[1], lng: bbox[2] + offsetDistance },
    { lat: bbox[3] + offsetDistance, lng: center[0] },
    { lat: bbox[1] - offsetDistance, lng: center[0] },
  ];
}

/**
 * Calls OSRM API to fetch directions between coordinates with vehicle-specific speed calculation,
 * filtering out any routes that contain dead-end spurs or U-turn reversals.
 */
export async function fetchOsrmRoute(
  coordinates: Coordinate[],
  vehicleType: VehicleType = 'motorbike'
): Promise<RouteResult[]> {
  const coordString = coordinates.map((c) => `${c.lng},${c.lat}`).join(';');
  const url = `${ENV.OSRM_URL}/route/v1/driving/${coordString}?alternatives=true&geometries=geojson&overview=full&steps=true&continue_straight=true`;

  try {
    const response = await axios.get(url, { timeout: 6000 });
    if (!response.data || !response.data.routes || response.data.routes.length === 0) {
      throw new Error('No route found from OSRM');
    }

    const validRoutes = response.data.routes
      .filter((r: any) => !isRouteInvalidSpur(r))
      .map((r: any) => ({
        distanceMeters: Math.round(r.distance),
        durationSeconds: calculateVehicleDuration(r.distance, vehicleType),
        isFlooded: false,
        maxFloodDepthCm: 0,
        floodedDistanceMeters: 0,
        geometry: r.geometry,
      }));

    if (validRoutes.length > 0) {
      return validRoutes;
    }

    // Fallback: If all alternatives had spurs, return primary route if it was a direct query
    if (coordinates.length === 2) {
      const primary = response.data.routes[0];
      return [
        {
          distanceMeters: Math.round(primary.distance),
          durationSeconds: calculateVehicleDuration(primary.distance, vehicleType),
          isFlooded: false,
          maxFloodDepthCm: 0,
          floodedDistanceMeters: 0,
          geometry: primary.geometry,
        },
      ];
    }

    return [];
  } catch (error) {
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
 * Searches for clean, continuous detour routes around flood obstacles by snapping candidate
 * offsets onto real named thoroughfares via OSRM /nearest, strictly excluding dead-end alleys.
 */
export async function findCleanDetourRoutes(
  origin: Coordinate,
  destination: Coordinate,
  hazardPolygon: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  vehicleType: VehicleType = 'motorbike'
): Promise<RouteResult[]> {
  const bbox = turf.bbox(hazardPolygon);
  const center = turf.center(turf.feature(hazardPolygon)).geometry.coordinates;

  const offset = vehicleType === 'motorbike' ? 0.009 : 0.016;
  const rawOffsets = [
    { lng: bbox[0] - offset, lat: center[1] },
    { lng: bbox[2] + offset, lat: center[1] },
    { lng: center[0], lat: bbox[3] + offset },
    { lng: center[0], lat: bbox[1] - offset },
    { lng: bbox[0] - offset * 1.5, lat: center[1] },
    { lng: bbox[2] + offset * 1.5, lat: center[1] },
    { lng: center[0], lat: bbox[3] + offset * 1.5 },
    { lng: center[0], lat: bbox[1] - offset * 1.5 },
  ];

  const candidateRoutes: RouteResult[] = [];

  for (const cand of rawOffsets) {
    try {
      const nearestUrl = `${ENV.OSRM_URL}/nearest/v1/driving/${cand.lng},${cand.lat}?number=5`;
      const nearRes = await axios.get(nearestUrl, { timeout: 4000 });
      const waypoints = nearRes.data.waypoints || [];

      for (const wp of waypoints) {
        const roadName = wp.name || '';
        const lowerName = roadName.toLowerCase();
        // Skip unnamed streets and residential alleys
        if (
          !roadName ||
          lowerName.startsWith('hẻm') ||
          lowerName.startsWith('ngõ') ||
          lowerName.startsWith('kiệt') ||
          lowerName.startsWith('ngách')
        ) {
          continue;
        }

        const [snapLng, snapLat] = wp.location;
        const detourRoutes = await fetchOsrmRoute(
          [origin, { lng: snapLng, lat: snapLat }, destination],
          vehicleType
        );

        if (detourRoutes && detourRoutes.length > 0) {
          candidateRoutes.push(detourRoutes[0]);
          break; // Found a valid through-road for this direction
        }
      }
      if (candidateRoutes.length >= 2) {
        break; // Sufficient alternative detours found
      }
    } catch (e) {
      // Continue searching next offset
    }
  }

  return candidateRoutes;
}

/**
 * Computes both the safe route and the fastest route avoiding active flood zones,
 * taking into account vehicle type (motorbike vs car) for speed and clearance,
 * with strict protection against dead ends and spurious alley detours.
 */
export async function navigateSafeRoute(
  origin: Coordinate,
  destination: Coordinate,
  targetTime: Date,
  vehicleType: VehicleType,
  events: FloodEvent[]
): Promise<{ safeRoute: RouteResult; fastestRoute: RouteResult }> {
  // 1. Fetch base direct routes from OSRM
  const baseRoutes = await fetchOsrmRoute([origin, destination], vehicleType);
  const candidatePool: RouteResult[] = [...baseRoutes];

  // 2. Evaluate base candidates against flood events
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

  // Fastest route is the lowest duration among base routes
  evaluatedCandidates.sort((a, b) => a.route.durationSeconds - b.route.durationSeconds);
  const fastestRoute: RouteResult = { ...evaluatedCandidates[0].route };

  // 3. Safe route determination:
  // First, check if any direct alternative route is completely dry
  const dryBaseCandidates = evaluatedCandidates.filter((c) => !c.analysis.isFlooded);

  let safeRoute: RouteResult | null = null;

  // If the fastest route is flooded for this vehicle, compute targeted detours via real through-roads
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

      const cleanDetours = await findCleanDetourRoutes(origin, destination, localHazard.geometry, vehicleType);
      for (const dRoute of cleanDetours) {
        const detourAnalysis = extractRouteFloodedSegments(dRoute.geometry, events, targetTime, vehicleType);
        candidateDetours.push({
          route: {
            ...dRoute,
            isFlooded: detourAnalysis.isFlooded,
            maxFloodDepthCm: detourAnalysis.maxFloodDepthCm,
            floodedDistanceMeters: detourAnalysis.floodedDistanceMeters,
            floodedSegments: detourAnalysis.floodedSegments,
          },
          analysis: detourAnalysis,
        });
      }
    }

    // 1st Priority: Pick the shortest completely dry detour route
    const completelyDry = candidateDetours
      .filter((c) => !c.analysis.isFlooded)
      .sort((a, b) => a.route.distanceMeters - b.route.distanceMeters);

    if (completelyDry.length > 0) {
      safeRoute = completelyDry[0].route;
    } else if (dryBaseCandidates.length > 0) {
      // 2nd Priority: Pick from dry base candidates
      safeRoute = dryBaseCandidates[0].route;
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
    // If fastest route is not flooded:
    // If there is another dry candidate with different geometry, offer it as safeRoute
    if (dryBaseCandidates.length > 1) {
      const alternative = dryBaseCandidates.find(
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
