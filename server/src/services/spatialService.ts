import * as turf from '@turf/turf';
import { FloodEvent, VehicleType } from '../types';
import { calculateTidalDepth, calculateRainDepth, isHazardActive } from './predictionEngine';

/**
 * Builds a GeoJSON MultiPolygon representing all active flood hazard zones at targetTime for vehicleType.
 */
export function buildHazardMultiPolygonFromEvents(
  events: FloodEvent[],
  targetTime: Date,
  vehicleType: VehicleType
): GeoJSON.MultiPolygon | null {
  const activePolygons: GeoJSON.Feature<GeoJSON.Polygon>[] = [];

  for (const event of events) {
    const depth = event.cause === 'high_tide'
      ? calculateTidalDepth(event, targetTime)
      : calculateRainDepth(event, targetTime);

    if (isHazardActive(depth, event.confidenceScore, vehicleType)) {
      // Create an 80m buffer around geometry to match routingEngine
      const pt = turf.point(event.geometry.coordinates);
      const buffered = turf.buffer(pt, 0.08, { units: 'kilometers' });
      if (buffered && buffered.geometry.type === 'Polygon') {
        activePolygons.push(buffered as GeoJSON.Feature<GeoJSON.Polygon>);
      }
    }
  }

  if (activePolygons.length === 0) {
    return null;
  }

  // Combine buffered polygons into MultiPolygon coordinates
  const multiCoords: GeoJSON.Position[][][] = activePolygons.map(
    (p) => p.geometry.coordinates
  );

  return turf.multiPolygon(multiCoords).geometry;
}
