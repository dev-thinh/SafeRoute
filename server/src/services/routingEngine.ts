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
 * Standard spatial buffer radius for urban flood hazards.
 * 80 meters radius covers 160m along the flooded roadway dip/trough,
 * while preventing spillover onto dry parallel streets.
 */
export const FLOOD_HAZARD_RADIUS_METERS = 80;
export const FLOOD_HAZARD_RADIUS_KM = 0.08;

/**
 * Calculates realistic travel duration in urban Vietnam.
 * Motorbikes: ~32 km/h (8.89 m/s) navigating traffic and filtering through lanes.
 * Cars: ~20 km/h (5.56 m/s) due to urban congestion, traffic light phases, and lane restrictions.
 */
export function calculateVehicleDuration(distanceMeters: number, vehicleType: VehicleType = 'motorbike'): number {
  const speedMps = vehicleType === 'motorbike' ? (32 * 1000) / 3600 : (20 * 1000) / 3600;
  return Math.max(60, Math.round(distanceMeters / speedMps));
}

function distanceMetersBetween(a: [number, number], b: [number, number]): number {
  return turf.distance(turf.point(a), turf.point(b), { units: 'meters' });
}

function isSamePoint(a: [number, number], b: [number, number], toleranceMeters = 3): boolean {
  return distanceMetersBetween(a, b) <= toleranceMeters;
}

/**
 * Detects synthetic endpoint connectors that draw a straight line from a raw GPS/geocoded point
 * to the snapped road network. Those segments can visually cut across buildings or courtyards.
 */
export function hasSuspiciousEndpointConnector(
  coords: [number, number][],
  rawOrigin: Coordinate,
  rawDestination: Coordinate,
  maxConnectorMeters = 70
): boolean {
  if (!coords || coords.length < 3) return false;

  const rawStart: [number, number] = [rawOrigin.lng, rawOrigin.lat];
  const rawEnd: [number, number] = [rawDestination.lng, rawDestination.lat];
  const first = coords[0];
  const second = coords[1];
  const last = coords[coords.length - 1];
  const beforeLast = coords[coords.length - 2];

  const hasLongStartConnector =
    isSamePoint(first, rawStart) && distanceMetersBetween(first, second) > maxConnectorMeters;
  const hasLongEndConnector =
    isSamePoint(last, rawEnd) && distanceMetersBetween(beforeLast, last) > maxConnectorMeters;

  return hasLongStartConnector || hasLongEndConnector;
}

export function stripRawEndpointConnectors(
  geometry: GeoJSON.LineString,
  rawOrigin: Coordinate,
  rawDestination: Coordinate,
  maxConnectorMeters = 70
): GeoJSON.LineString {
  const coords = geometry.coordinates as [number, number][];
  if (!coords || coords.length < 3) return geometry;

  const nextCoords = [...coords];
  const rawStart: [number, number] = [rawOrigin.lng, rawOrigin.lat];
  const rawEnd: [number, number] = [rawDestination.lng, rawDestination.lat];

  if (
    nextCoords.length >= 3 &&
    isSamePoint(nextCoords[0], rawStart) &&
    distanceMetersBetween(nextCoords[0], nextCoords[1]) > maxConnectorMeters
  ) {
    nextCoords.shift();
  }

  if (
    nextCoords.length >= 3 &&
    isSamePoint(nextCoords[nextCoords.length - 1], rawEnd) &&
    distanceMetersBetween(nextCoords[nextCoords.length - 2], nextCoords[nextCoords.length - 1]) > maxConnectorMeters
  ) {
    nextCoords.pop();
  }

  return {
    ...geometry,
    coordinates: nextCoords,
  };
}

/**
 * Detects whether an OSRM route contains a dead-end spur, U-turn, or cul-de-sac reversal.
 * Returns true if the route turns into a dead end, visits an impassable alley for cars, or backtracks.
 */
export function isRouteInvalidSpur(route: any, vehicleType: VehicleType = 'car'): boolean {
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

      // Only reject narrow residential alleys for cars
      // Motorbikes in Vietnam routinely and safely navigate through alleys
      if (vehicleType === 'car') {
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
      }

      // Check turnaround angle (> 140° turnaround at waypoint indicating backtracking)
      const bIn = lastStep0.maneuver.bearing_before;
      const bOut = firstStep1.maneuver.bearing_after;
      if (bIn !== undefined && bOut !== undefined) {
        let diff = Math.abs(bOut - bIn);
        if (diff > 180) diff = 360 - diff;
        if (diff > 140) {
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
    const hazardBuf = turf.buffer(eventPt, FLOOD_HAZARD_RADIUS_KM, { units: 'kilometers' });
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
 * Decodes Google / Mapbox / Goong encoded polyline into [lng, lat] GeoJSON coordinates.
 */
export function decodePolyline(str: string): [number, number][] {
  let index = 0, lat = 0, lng = 0;
  const coordinates: [number, number][] = [];
  while (index < str.length) {
    let b, shift = 0, result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    coordinates.push([lng / 1e5, lat / 1e5]);
  }
  return coordinates;
}

/**
 * Calls Goong Direction API tailored for Vietnam road & alley networks.
 * Directly supports motorbike (bike) and car profiles without snapping across parallel walls.
 */
export async function fetchGoongRoute(
  coordinates: Coordinate[],
  vehicleType: VehicleType = 'motorbike'
): Promise<RouteResult[]> {
  if (!ENV.GOONG_API_KEY || coordinates.length < 2) return [];

  const origin = `${coordinates[0].lat},${coordinates[0].lng}`;
  const destination = `${coordinates[coordinates.length - 1].lat},${coordinates[coordinates.length - 1].lng}`;
  const vehicle = vehicleType === 'motorbike' ? 'bike' : 'car';

  let waypointsParam = '';
  if (coordinates.length > 2) {
    const intermediate = coordinates.slice(1, -1).map((c) => `${c.lat},${c.lng}`).join('|');
    waypointsParam = `&waypoints=${intermediate}`;
  }

  try {
    const url = `https://rsapi.goong.io/Direction?origin=${origin}&destination=${destination}${waypointsParam}&vehicle=${vehicle}&alternatives=true&api_key=${ENV.GOONG_API_KEY}`;
    const response = await axios.get(url, { timeout: 5000 });
    const routes = response.data?.routes;
    if (!routes || routes.length === 0) return [];

    return routes
      .map((r: any) => {
        const coords = decodePolyline(r.overview_polyline?.points || '');
        const distMeters = r.legs?.reduce((sum: number, leg: any) => sum + (leg.distance?.value || 0), 0) || 5000;
        const durSeconds = calculateVehicleDuration(distMeters, vehicleType);

        return {
          distanceMeters: distMeters,
          durationSeconds: durSeconds,
          isFlooded: false,
          maxFloodDepthCm: 0,
          floodedDistanceMeters: 0,
          geometry: {
            type: 'LineString',
            coordinates: coords,
          } as GeoJSON.LineString,
        };
      })
      .filter((r: RouteResult) => r.geometry.coordinates.length > 1);
  } catch (err: any) {
    console.warn('Goong Direction error, falling back to OSRM:', err.message);
    return [];
  }
}

/**
 * Calls Goong Direction for 3 coordinates (origin -> waypoint -> destination)
 * by combining Leg 1 and Leg 2, because Goong Direction API does not support intermediate waypoints in a single query.
 */
export async function fetchGoongMultiLegRoute(
  coordinates: Coordinate[],
  vehicleType: VehicleType = 'motorbike'
): Promise<RouteResult[]> {
  if (!ENV.GOONG_API_KEY || coordinates.length !== 3) return [];
  const vehicle = vehicleType === 'motorbike' ? 'bike' : 'car';
  try {
    const [res1, res2] = await Promise.all([
      axios.get(
        `https://rsapi.goong.io/Direction?origin=${coordinates[0].lat},${coordinates[0].lng}&destination=${coordinates[1].lat},${coordinates[1].lng}&vehicle=${vehicle}&api_key=${ENV.GOONG_API_KEY}`,
        { timeout: 4000 }
      ),
      axios.get(
        `https://rsapi.goong.io/Direction?origin=${coordinates[1].lat},${coordinates[1].lng}&destination=${coordinates[2].lat},${coordinates[2].lng}&vehicle=${vehicle}&api_key=${ENV.GOONG_API_KEY}`,
        { timeout: 4000 }
      ),
    ]);

    const r1 = res1.data?.routes?.[0];
    const r2 = res2.data?.routes?.[0];
    if (!r1 || !r2) return [];

    const coords1 = decodePolyline(r1.overview_polyline?.points || '');
    const coords2 = decodePolyline(r2.overview_polyline?.points || '');
    const combinedCoords = [...coords1, ...coords2];
    const totalDist = (r1.legs?.[0]?.distance?.value || 0) + (r2.legs?.[0]?.distance?.value || 0);

    return [
      {
        distanceMeters: totalDist,
        durationSeconds: calculateVehicleDuration(totalDist, vehicleType),
        isFlooded: false,
        maxFloodDepthCm: 0,
        floodedDistanceMeters: 0,
        geometry: {
          type: 'LineString',
          coordinates: combinedCoords,
        },
      },
    ];
  } catch (err: any) {
    return [];
  }
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
  const url = `${ENV.OSRM_URL}/route/v1/driving/${coordString}?alternatives=true&geometries=geojson&overview=full&steps=true&continue_straight=default`;

  try {
    const response = await axios.get(url, { timeout: 6000 });
    if (!response.data || !response.data.routes || response.data.routes.length === 0) {
      throw new Error('No route found from OSRM');
    }

    const sanitizeCandidateRoute = (r: any): RouteResult | null => {
      const rawCoords = (r.geometry?.coordinates || []) as [number, number][];
      const prunedCoords = pruneAlleyTurnaroundSpurs(rawCoords);
      const geometry = stripRawEndpointConnectors(
        { type: 'LineString', coordinates: prunedCoords },
        coordinates[0],
        coordinates[coordinates.length - 1]
      );
      if (isRouteInvalidSpur(r, vehicleType) || hasRouteBacktrack(geometry.coordinates as [number, number][])) {
        return null;
      }
      return {
        distanceMeters: Math.round(r.distance),
        durationSeconds: calculateVehicleDuration(r.distance, vehicleType),
        isFlooded: false,
        maxFloodDepthCm: 0,
        floodedDistanceMeters: 0,
        geometry,
      };
    };

    const validRoutes = response.data.routes
      .map(sanitizeCandidateRoute)
      .filter((r: RouteResult | null): r is RouteResult => r !== null);

    if (validRoutes.length > 0) {
      return validRoutes;
    }

    // Fallback: If all alternatives had spurs, return primary route if it passes after pruning
    if (coordinates.length === 2) {
      const primary = sanitizeCandidateRoute(response.data.routes[0]);
      if (primary) {
        return [primary];
      }
    }

    return [];
  } catch (error) {
    // If routing failed on raw alley points, snap origin and destination to nearest road network entry
    if (coordinates.length === 2) {
      try {
        const [snapO, snapD] = await Promise.all([
          axios.get(`${ENV.OSRM_URL}/nearest/v1/driving/${coordinates[0].lng},${coordinates[0].lat}?number=1`, { timeout: 3000 }),
          axios.get(`${ENV.OSRM_URL}/nearest/v1/driving/${coordinates[1].lng},${coordinates[1].lat}?number=1`, { timeout: 3000 }),
        ]);
        const locO = snapO.data?.waypoints?.[0]?.location;
        const locD = snapD.data?.waypoints?.[0]?.location;
        if (locO && locD) {
          const snappedUrl = `${ENV.OSRM_URL}/route/v1/driving/${locO[0]},${locO[1]};${locD[0]},${locD[1]}?geometries=geojson&overview=full`;
          const sRes = await axios.get(snappedUrl, { timeout: 4000 });
          const sRoute = sRes.data?.routes?.[0];
          if (sRoute) {
            const rawCoords = [
              [coordinates[0].lng, coordinates[0].lat],
              ...sRoute.geometry.coordinates,
              [coordinates[1].lng, coordinates[1].lat],
            ] as [number, number][];
            const prunedCoords = pruneAlleyTurnaroundSpurs(rawCoords);
            const geometry = stripRawEndpointConnectors(
              { type: 'LineString', coordinates: prunedCoords },
              coordinates[0],
              coordinates[1]
            );
            if (hasRouteBacktrack(geometry.coordinates as [number, number][])) {
              return [];
            }
            return [
              {
                distanceMeters: Math.round(sRoute.distance),
                durationSeconds: calculateVehicleDuration(sRoute.distance, vehicleType),
                isFlooded: false,
                maxFloodDepthCm: 0,
                floodedDistanceMeters: 0,
                geometry,
              },
            ];
          }
        }
      } catch (snapErr) {
        // Continue
      }
    }
    return [];
  }
}

/**
 * Removes dead-end cul-de-sac spurs at the start or end of a route (e.g., when a user is in the middle
 * of an alley and the router sends them to the end of the alley to turn around before going out).
 */
export function pruneAlleyTurnaroundSpurs(coords: [number, number][]): [number, number][] {
  if (!coords || coords.length < 5) return coords;

  let current = [...coords];

  // 1. Check start turnaround spur
  const startMaxK = Math.min(current.length - 2, 25);
  for (let k = 3; k < startMaxK; k++) {
    const distToStart = turf.distance(turf.point(current[k]), turf.point(current[0]), { units: 'meters' });
    if (distToStart < 20) {
      let pathDist = 0;
      for (let s = 0; s < k; s++) {
        pathDist += turf.distance(turf.point(current[s]), turf.point(current[s + 1]), { units: 'meters' });
      }
      if (pathDist >= 20) {
        const [dx1, dy1] = [current[1][0] - current[0][0], current[1][1] - current[0][1]];
        const [dx2, dy2] = [current[k][0] - current[k - 1][0], current[k][1] - current[k - 1][1]];
        const len1 = Math.hypot(dx1, dy1);
        const len2 = Math.hypot(dx2, dy2);
        if (len1 > 0 && len2 > 0 && (dx1 * dx2 + dy1 * dy2) / (len1 * len2) < -0.6) {
          const distExact = turf.distance(turf.point(current[k]), turf.point(current[0]), { units: 'meters' });
          const remainder = distExact < 3 ? current.slice(k + 1) : current.slice(k);
          current = [current[0], ...remainder];
          break;
        }
      }
    }
  }

  // 2. Check end turnaround spur
  if (current.length >= 5) {
    const lastIdx = current.length - 1;
    const endMinK = Math.max(1, current.length - 25);
    for (let k = lastIdx - 3; k >= endMinK; k--) {
      const distToEnd = turf.distance(turf.point(current[k]), turf.point(current[lastIdx]), { units: 'meters' });
      if (distToEnd < 20) {
        let pathDist = 0;
        for (let s = k; s < lastIdx; s++) {
          pathDist += turf.distance(turf.point(current[s]), turf.point(current[s + 1]), { units: 'meters' });
        }
        if (pathDist >= 20) {
          const [dx1, dy1] = [current[k + 1][0] - current[k][0], current[k + 1][1] - current[k][1]];
          const [dx2, dy2] = [current[lastIdx][0] - current[lastIdx - 1][0], current[lastIdx][1] - current[lastIdx - 1][1]];
          const len1 = Math.hypot(dx1, dy1);
          const len2 = Math.hypot(dx2, dy2);
          if (len1 > 0 && len2 > 0 && (dx1 * dx2 + dy1 * dy2) / (len1 * len2) < -0.6) {
            const distExact = turf.distance(turf.point(current[k]), turf.point(current[lastIdx]), { units: 'meters' });
            const prefix = distExact < 3 ? current.slice(0, k) : current.slice(0, k + 1);
            current = [...prefix, current[lastIdx]];
            break;
          }
        }
      }
    }
  }

  return current;
}

/**
 * Detects whether a route geometry contains any hairpin U-turn spurs or cul-de-sac backtracking
 * (e.g. driving into a dead-end alley to satisfy a waypoint, then turning 180° around and driving back out).
 */
export function hasRouteBacktrack(coords: [number, number][]): boolean {
  if (!coords || coords.length < 5) return false;
  for (let i = 0; i < coords.length - 3; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    const dx1 = x2 - x1, dy1 = y2 - y1;
    const len1 = Math.hypot(dx1, dy1);
    if (len1 === 0) continue;
    let pathDist = 0;
    const maxJ = Math.min(coords.length - 1, i + 35);
    for (let j = i + 1; j < maxJ; j++) {
      const [u1, v1] = coords[j];
      const [u2, v2] = coords[j + 1];
      const legDist = turf.distance(turf.point([u1, v1]), turf.point([u2, v2]), { units: 'meters' });
      pathDist += legDist;
      if (j - i < 2 || pathDist < 25) continue;
      const dx2 = u2 - u1, dy2 = v2 - v1;
      const len2 = Math.hypot(dx2, dy2);
      if (len2 === 0) continue;
      const cosSim = (dx1 * dx2 + dy1 * dy2) / (len1 * len2);
      if (cosSim < -0.80) {
        const mid1 = [(x1 + x2) / 2, (y1 + y2) / 2];
        const mid2 = [(u1 + u2) / 2, (v1 + v2) / 2];
        const dist = turf.distance(turf.point(mid1), turf.point(mid2), { units: 'meters' });
        if (dist < 20) return true;
      }
    }
  }
  return false;
}

/**
 * Gathers a diverse pool of natural through-routes across both Goong and OSRM engines,
 * filtering out any cul-de-sacs or backtracking paths.
 */
export async function fetchBaseRoutePool(
  origin: Coordinate,
  destination: Coordinate,
  vehicleType: VehicleType = 'motorbike'
): Promise<RouteResult[]> {
  const pool: RouteResult[] = [];

  if (ENV.GOONG_API_KEY) {
    const [goongMain, goongCar] = await Promise.all([
      fetchGoongRoute([origin, destination], vehicleType),
      vehicleType === 'motorbike' ? fetchGoongRoute([origin, destination], 'car') : Promise.resolve([]),
    ]);
    pool.push(...goongMain, ...goongCar);
  }

  const osrmRoutes = await fetchOsrmRoute([origin, destination], vehicleType);
  pool.push(...osrmRoutes);

  // Deduplicate routes by distance and preserve all valid street geometries
  const uniquePool: RouteResult[] = [];
  for (const r of pool) {
    if (!r.geometry?.coordinates || r.geometry.coordinates.length < 2) continue;

    const isDup = uniquePool.some((ex) => Math.abs(ex.distanceMeters - r.distanceMeters) < 40);
    if (!isDup) {
      uniquePool.push(r);
    }
  }

  return uniquePool;
}

/**
 * Unified route fetcher: tries Goong Direction first (with alley & motorbike support),
 * and transparently falls back to OSRM.
 */
export async function fetchRoutes(
  coordinates: Coordinate[],
  vehicleType: VehicleType = 'motorbike'
): Promise<RouteResult[]> {
  if (ENV.GOONG_API_KEY) {
    if (coordinates.length === 2) {
      const goongRoutes = await fetchGoongRoute(coordinates, vehicleType);
      if (goongRoutes.length > 0) {
        return goongRoutes;
      }
    } else if (coordinates.length === 3) {
      const multiRoutes = await fetchGoongMultiLegRoute(coordinates, vehicleType);
      if (multiRoutes.length > 0) {
        return multiRoutes;
      }
    }
  }

  return fetchOsrmRoute(coordinates, vehicleType);
}

/**
 * Searches for clean, continuous detour routes around flood obstacles by placing strategic lateral
 * waypoints perpendicular to the travel direction on real named thoroughfares, completely avoiding cul-de-sacs.
 */
export async function findCleanDetourRoutes(
  origin: Coordinate,
  destination: Coordinate,
  hazardPolygon: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  vehicleType: VehicleType = 'motorbike'
): Promise<RouteResult[]> {
  const center = turf.center(turf.feature(hazardPolygon)).geometry.coordinates;

  // Compute travel direction vector from origin to destination
  const dx = destination.lng - origin.lng;
  const dy = destination.lat - origin.lat;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  // Lateral perpendicular vectors flanking the hazard (left and right of the corridor)
  const p1 = { x: -uy, y: ux };
  const p2 = { x: uy, y: -ux };

  // Generate strategic lateral offsets flanking the flooded roadway
  const rawOffsets: Coordinate[] = [
    { lng: center[0] + p1.x * 0.0035, lat: center[1] + p1.y * 0.0035 },
    { lng: center[0] + p2.x * 0.0035, lat: center[1] + p2.y * 0.0035 },
    { lng: center[0] + p1.x * 0.007, lat: center[1] + p1.y * 0.007 },
    { lng: center[0] + p2.x * 0.007, lat: center[1] + p2.y * 0.007 },
    { lng: center[0], lat: center[1] + 0.004 },
    { lng: center[0], lat: center[1] - 0.004 },
    { lng: center[0] + 0.004, lat: center[1] },
    { lng: center[0] - 0.004, lat: center[1] },
  ];

  const candidateRoutes: RouteResult[] = [];
  const snappedWaypoints: { lng: number; lat: number }[] = [];

  for (const raw of rawOffsets) {
    try {
      const nearestUrl = `${ENV.OSRM_URL}/nearest/v1/driving/${raw.lng},${raw.lat}?number=3`;
      const nearRes = await axios.get(nearestUrl, { timeout: 2500 });
      const waypoints = nearRes.data?.waypoints || [];

      for (const wp of waypoints) {
        const roadName = (wp.name || '').trim();
        const lowerName = roadName.toLowerCase();

        // Intermediate waypoints must be on public named thoroughfares, never in dead-end alleys
        if (
          !roadName ||
          lowerName.startsWith('hẻm') ||
          lowerName.startsWith('ngõ') ||
          lowerName.startsWith('kiệt') ||
          lowerName.startsWith('ngách') ||
          lowerName.startsWith('đường nội bộ')
        ) {
          continue;
        }

        // Must be at least 90m away from the flood center to avoid the hazard buffer
        const distFromHazard = turf.distance(
          turf.point([wp.location[0], wp.location[1]]),
          turf.point([center[0], center[1]]),
          { units: 'meters' }
        );
        if (distFromHazard < 90) continue;

        // Deduplicate waypoints
        const isDuplicate = snappedWaypoints.some((ex) =>
          turf.distance(turf.point([ex.lng, ex.lat]), turf.point([wp.location[0], wp.location[1]]), { units: 'meters' }) < 150
        );
        if (isDuplicate) continue;

        snappedWaypoints.push({ lng: wp.location[0], lat: wp.location[1] });
        break; // Found primary through-street for this offset
      }

      if (snappedWaypoints.length >= 3) break;
    } catch (e) {
      // Continue searching next offset
    }
  }

  for (const wp of snappedWaypoints) {
    try {
      const detourRoutes = await fetchRoutes(
        [origin, { lng: wp.lng, lat: wp.lat }, destination],
        vehicleType
      );

      if (detourRoutes && detourRoutes.length > 0) {
        const candRoute = detourRoutes[0];
        // Strictly reject any synthetic detour that backtracks into a dead-end alley
        if (!hasRouteBacktrack(candRoute.geometry.coordinates as [number, number][])) {
          candidateRoutes.push(candRoute);
        }
      }
    } catch (routeErr) {
      // Continue to next candidate
    }
  }

  return candidateRoutes;
}

/**
 * Computes both the safe route and the fastest route avoiding active flood zones,
 * prioritizing natural direct alternatives from Goong & OSRM before resorting to synthetic detours.
 */
export async function navigateSafeRoute(
  origin: Coordinate,
  destination: Coordinate,
  targetTime: Date,
  vehicleType: VehicleType,
  events: FloodEvent[]
): Promise<{ safeRoute: RouteResult; fastestRoute: RouteResult }> {
  // 1. Fetch diverse base route pool across Goong (bike & car thoroughfares) and OSRM
  let baseRoutes = await fetchBaseRoutePool(origin, destination, vehicleType);

  // If pool was empty (e.g. temporary API timeout), retry with direct fetchRoutes
  if (baseRoutes.length === 0) {
    baseRoutes = await fetchRoutes([origin, destination], vehicleType);
  }

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

  if (evaluatedCandidates.length === 0) {
    throw new Error('Không thể tìm thấy lộ trình trên mạng lưới đường bộ giữa hai địa điểm này');
  }

  const fastestRoute: RouteResult = { ...evaluatedCandidates[0].route };

  // 3. Safe route determination:
  const dryBaseCandidates = evaluatedCandidates.filter((c) => !c.analysis.isFlooded);

  let safeRoute: RouteResult | null = null;

  // If the fastest route is already completely dry, safe route is the fastest route
  if (!fastestRoute.isFlooded) {
    safeRoute = fastestRoute;
  } else {
    // Fastest route IS flooded!
    // PRIORITY 1: Check if an alternative base route from the pool (e.g. Goong bike/car alternative) is dry!
    if (dryBaseCandidates.length > 0) {
      dryBaseCandidates.sort((a, b) => a.route.distanceMeters - b.route.distanceMeters);
      safeRoute = dryBaseCandidates[0].route;
    }

    // PRIORITY 2: If no base route is dry, compute clean through-street detours around the flood hazards
    if (!safeRoute || safeRoute.isFlooded) {
      const hitEvents = events.filter((ev) => {
        const depth = Math.round(calculateEventDepth(ev, targetTime));
        if (depth < (VEHICLE_THRESHOLDS[vehicleType]?.avoid || 20)) return false;
        const pt = turf.point(ev.geometry.coordinates);
        const buf = turf.buffer(pt, FLOOD_HAZARD_RADIUS_KM, { units: 'kilometers' });
        return buf && turf.booleanIntersects(turf.lineString(fastestRoute.geometry.coordinates), buf);
      });

      const candidateDetours: { route: RouteResult; analysis: ReturnType<typeof extractRouteFloodedSegments> }[] = [];

      for (const hitEvent of hitEvents) {
        const pt = turf.point(hitEvent.geometry.coordinates);
        const localHazard = turf.buffer(pt, FLOOD_HAZARD_RADIUS_KM, { units: 'kilometers' });
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

      // Filter for 100% DRY detours
      const dryDetours = candidateDetours
        .filter((c) => !c.analysis.isFlooded)
        .sort((a, b) => a.route.distanceMeters - b.route.distanceMeters);

      if (dryDetours.length > 0) {
        // Shortest completely dry detour route
        safeRoute = dryDetours[0].route;
      } else if (candidateDetours.length > 0) {
        // If unavoidable (e.g. origin/destination is on flooded segment), pick detour with minimal flood depth & distance
        candidateDetours.sort(
          (a, b) =>
            a.analysis.maxFloodDepthCm - b.analysis.maxFloodDepthCm ||
            a.analysis.floodedDistanceMeters - b.analysis.floodedDistanceMeters ||
            a.route.distanceMeters - b.route.distanceMeters
        );
        safeRoute = candidateDetours[0].route;
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
