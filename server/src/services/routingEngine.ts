import axios from 'axios';
import * as turf from '@turf/turf';
import { Coordinate, VehicleType, FloodEvent } from '../types';
import { ENV } from '../config/env';
import { buildHazardMultiPolygonFromEvents } from './spatialService';

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  isFlooded: boolean;
  maxFloodDepthCm: number;
  floodedDistanceMeters: number;
  geometry: GeoJSON.LineString;
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
  const fastestExposure = evaluateRouteFloodExposure(fastestRoute.geometry, hazardPolygon);
  fastestRoute.isFlooded = fastestExposure.isFlooded;
  fastestRoute.floodedDistanceMeters = fastestExposure.floodedDistanceMeters;

  // Search if any alternative route is dry
  let safeRoute: RouteResult | null = null;
  for (const candidate of baseRoutes) {
    const exposure = evaluateRouteFloodExposure(candidate.geometry, hazardPolygon);
    if (!exposure.isFlooded) {
      safeRoute = { ...candidate, isFlooded: false, floodedDistanceMeters: 0 };
      break;
    }
  }

  // If all default alternatives cut through flood, calculate smart detour
  if (!safeRoute && hazardPolygon) {
    const detourWaypoints = generateDetourWaypoints(origin, destination, hazardPolygon);
    for (const waypoint of detourWaypoints) {
      const detourRoutes = await fetchOsrmRoute([origin, waypoint, destination]);
      const detourExposure = evaluateRouteFloodExposure(detourRoutes[0].geometry, hazardPolygon);
      if (!detourExposure.isFlooded) {
        safeRoute = { ...detourRoutes[0], isFlooded: false, floodedDistanceMeters: 0 };
        break;
      }
    }
  }

  return {
    safeRoute: safeRoute || fastestRoute,
    fastestRoute,
  };
}
