import { describe, it, expect } from 'vitest';
import {
  evaluateRouteFloodExposure,
  generateDetourWaypoints,
  calculateVehicleDuration,
  extractRouteFloodedSegments,
} from '../src/services/routingEngine';
import { FloodEvent } from '../src/types';
import * as turf from '@turf/turf';

describe('RoutingEngine & Detour Logic', () => {
  it('should detect when a route cuts through a flood hazard polygon', () => {
    // Route from (10.74, 106.70) to (10.76, 106.70)
    const routeLine = turf.lineString([
      [106.70, 10.74],
      [106.70, 10.76],
    ]);

    // Hazard polygon centered at (10.75, 106.70)
    const hazardPolygon = turf.polygon([
      [
        [106.695, 10.745],
        [106.705, 10.745],
        [106.705, 10.755],
        [106.695, 10.755],
        [106.695, 10.745],
      ],
    ]);

    const exposure = evaluateRouteFloodExposure(routeLine.geometry, hazardPolygon.geometry);
    expect(exposure.isFlooded).toBe(true);
    expect(exposure.floodedDistanceMeters).toBeGreaterThan(0);
  });

  it('generateDetourWaypoints should produce bypass coordinates outside the hazard bounding box', () => {
    const origin = { lat: 10.74, lng: 106.70 };
    const destination = { lat: 10.76, lng: 106.70 };
    const hazardPolygon = turf.polygon([
      [
        [106.695, 10.745],
        [106.705, 10.745],
        [106.705, 10.755],
        [106.695, 10.755],
        [106.695, 10.745],
      ],
    ]);

    const waypointsMb = generateDetourWaypoints(origin, destination, hazardPolygon.geometry, 'motorbike');
    const waypointsCar = generateDetourWaypoints(origin, destination, hazardPolygon.geometry, 'car');

    expect(waypointsMb.length).toBeGreaterThan(0);
    expect(waypointsCar.length).toBeGreaterThan(0);

    for (const pt of waypointsMb) {
      const isInside = turf.booleanPointInPolygon(turf.point([pt.lng, pt.lat]), hazardPolygon);
      expect(isInside).toBe(false);
    }

    // Car detour offset should be wider than motorbike detour offset
    const mbEastDist = Math.abs(waypointsMb[1].lng - 106.705);
    const carEastDist = Math.abs(waypointsCar[1].lng - 106.705);
    expect(carEastDist).toBeGreaterThan(mbEastDist);
  });

  it('calculateVehicleDuration should reflect urban traffic speeds (motorbike faster than car)', () => {
    const distanceMeters = 8000; // 8km
    const mbDuration = calculateVehicleDuration(distanceMeters, 'motorbike');
    const carDuration = calculateVehicleDuration(distanceMeters, 'car');

    // Motorbike (~32km/h) takes ~900s (15 min), Car (~20km/h) takes ~1440s (24 min)
    expect(mbDuration).toBeLessThan(carDuration);
    expect(mbDuration).toBeGreaterThan(600);
    expect(carDuration).toBeGreaterThan(1200);
  });

  it('extractRouteFloodedSegments should differentiate clearance between motorbike (20cm) and car (35cm)', () => {
    const routeLine = turf.lineString([
      [106.700, 10.740],
      [106.700, 10.760],
    ]);

    const flood22cm: FloodEvent = {
      id: 'flood-22',
      title: 'Đoạn ngập 22cm',
      sourceType: 'admin_manual',
      cause: 'combined',
      streetName: 'Đường A',
      district: 'Quận 7',
      city: 'TP. Hồ Chí Minh',
      startTime: new Date(Date.now() - 1800000),
      peakTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      estimatedDepthCm: 22,
      confidenceScore: 0.95,
      geometry: { type: 'Point', coordinates: [106.700, 10.750] },
    };

    const targetDate = new Date();

    const mbAnalysis22 = extractRouteFloodedSegments(routeLine.geometry, [flood22cm], targetDate, 'motorbike');
    const carAnalysis22 = extractRouteFloodedSegments(routeLine.geometry, [flood22cm], targetDate, 'car');

    // 22cm is >= 20cm (hazardous for motorbike), but < 35cm (passable for car)
    expect(mbAnalysis22.isFlooded).toBe(true);
    expect(carAnalysis22.isFlooded).toBe(false);

    // 42cm is hazardous for both
    const flood42cm: FloodEvent = {
      ...flood22cm,
      id: 'flood-42',
      estimatedDepthCm: 42,
    };

    const mbAnalysis42 = extractRouteFloodedSegments(routeLine.geometry, [flood42cm], targetDate, 'motorbike');
    const carAnalysis42 = extractRouteFloodedSegments(routeLine.geometry, [flood42cm], targetDate, 'car');

    expect(mbAnalysis42.isFlooded).toBe(true);
    expect(carAnalysis42.isFlooded).toBe(true);
  });
});
