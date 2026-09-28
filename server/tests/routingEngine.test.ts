import { describe, it, expect } from 'vitest';
import { evaluateRouteFloodExposure, generateDetourWaypoints } from '../src/services/routingEngine';
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

    const waypoints = generateDetourWaypoints(origin, destination, hazardPolygon.geometry);
    expect(waypoints.length).toBeGreaterThan(0);
    for (const pt of waypoints) {
      const isInside = turf.booleanPointInPolygon(turf.point([pt.lng, pt.lat]), hazardPolygon);
      expect(isInside).toBe(false);
    }
  });
});
