import { describe, it, expect } from 'vitest';
import {
  evaluateRouteFloodExposure,
  generateDetourWaypoints,
  calculateVehicleDuration,
  extractRouteFloodedSegments,
  hasRouteBacktrack,
  hasSuspiciousEndpointConnector,
  isRouteInvalidSpur,
  pruneAlleyTurnaroundSpurs,
  stripRawEndpointConnectors,
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

  it('stripRawEndpointConnectors removes synthetic straight segments through buildings', () => {
    const rawOrigin = { lat: 10.7600, lng: 106.6800 };
    const rawDestination = { lat: 10.7610, lng: 106.6870 };
    const snappedRoadStart: [number, number] = [106.6820, 10.7600];
    const snappedRoadEnd: [number, number] = [106.6858, 10.7610];
    const geometry: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: [
        [rawOrigin.lng, rawOrigin.lat],
        snappedRoadStart,
        [106.6835, 10.7604],
        snappedRoadEnd,
        [rawDestination.lng, rawDestination.lat],
      ],
    };

    expect(hasSuspiciousEndpointConnector(geometry.coordinates, rawOrigin, rawDestination)).toBe(true);

    const sanitized = stripRawEndpointConnectors(geometry, rawOrigin, rawDestination);

    expect(sanitized.coordinates[0]).toEqual(snappedRoadStart);
    expect(sanitized.coordinates[sanitized.coordinates.length - 1]).toEqual(snappedRoadEnd);
  });

  it('stripRawEndpointConnectors keeps normal short endpoint connectors', () => {
    const rawOrigin = { lat: 10.7600, lng: 106.6800 };
    const rawDestination = { lat: 10.7610, lng: 106.6810 };
    const geometry: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: [
        [106.6800, 10.7600],
        [106.68004, 10.76003],
        [106.6805, 10.7605],
        [106.68096, 10.76097],
        [106.6810, 10.7610],
      ],
    };

    expect(hasSuspiciousEndpointConnector(geometry.coordinates, rawOrigin, rawDestination)).toBe(false);
    expect(stripRawEndpointConnectors(geometry, rawOrigin, rawDestination).coordinates).toEqual(geometry.coordinates);
  });

  it('hasRouteBacktrack detects short alley reversal loops', () => {
    const coords: [number, number][] = [
      [106.6800, 10.7600],
      [106.6804, 10.7600],
      [106.6808, 10.7600],
      [106.6804, 10.7600],
      [106.6800, 10.7600],
      [106.6796, 10.7602],
    ];

    expect(hasRouteBacktrack(coords)).toBe(true);
  });

  it('hasRouteBacktrack does not flag tight continuous road curves or switchbacks', () => {
    // 3 short segments forming a tight U-curve (e.g. ramp or roundabout corner, total length < 20m)
    const tightCurveCoords: [number, number][] = [
      [106.7022138, 10.7528920],
      [106.7022671, 10.7528966],
      [106.7022663, 10.7529120],
      [106.7021614, 10.7529060],
      [106.7020744, 10.7529481],
    ];

    expect(hasRouteBacktrack(tightCurveCoords)).toBe(false);
  });

  it('pruneAlleyTurnaroundSpurs eliminates initial dead-end alley loop when starting in the middle of an alley', () => {
    const loopedCoords: [number, number][] = [
      [106.6800, 10.7600], // Start in middle of alley
      [106.6804, 10.7600], // Heading into dead end
      [106.6808, 10.7600], // Dead end apex
      [106.6804, 10.7600], // Returning back
      [106.6800, 10.7600], // Back at start position
      [106.6796, 10.7602], // Heading out to main street
      [106.6790, 10.7605], // On main street
    ];

    expect(hasRouteBacktrack(loopedCoords)).toBe(true);

    const pruned = pruneAlleyTurnaroundSpurs(loopedCoords);

    expect(pruned[0]).toEqual([106.6800, 10.7600]);
    expect(pruned[1]).toEqual([106.6796, 10.7602]);
    expect(pruned[2]).toEqual([106.6790, 10.7605]);
    expect(hasRouteBacktrack(pruned)).toBe(false);
  });

  it('pruneAlleyTurnaroundSpurs eliminates destination overshoot loop in an alley', () => {
    const overshootCoords: [number, number][] = [
      [106.6790, 10.7605], // Approaching on main street
      [106.6796, 10.7602], // Entering alley
      [106.6800, 10.7600], // Destination point reached
      [106.6804, 10.7600], // Overshooting into dead end
      [106.6808, 10.7600], // Dead end turnaround
      [106.6804, 10.7600], // Returning
      [106.6800, 10.7600], // Final destination
    ];

    const pruned = pruneAlleyTurnaroundSpurs(overshootCoords);

    expect(pruned[pruned.length - 1]).toEqual([106.6800, 10.7600]);
    expect(pruned.length).toBeLessThan(overshootCoords.length);
    expect(hasRouteBacktrack(pruned)).toBe(false);
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

  it('isRouteInvalidSpur should detect U-turns, alleys, and dead-end reversals', () => {
    // Clean route
    const cleanRoute = {
      geometry: { coordinates: [[106.68, 10.76], [106.70, 10.74]] },
      legs: [
        {
          steps: [
            { maneuver: { modifier: 'straight', bearing_before: 120, bearing_after: 120 }, name: 'Nguyễn Thị Thập' },
            { maneuver: { modifier: 'arrive', bearing_before: 120, bearing_after: 120 }, name: 'Nguyễn Thị Thập' },
          ],
        },
        {
          steps: [
            { maneuver: { modifier: 'depart', bearing_before: 125, bearing_after: 125 }, name: 'Nguyễn Hữu Thọ' },
            { maneuver: { modifier: 'arrive', bearing_before: 125, bearing_after: 125 }, name: 'Nguyễn Hữu Thọ' },
          ],
        },
      ],
    };
    expect(isRouteInvalidSpur(cleanRoute)).toBe(false);

    // Route with U-turn turnaround angle at waypoint (178 degrees)
    const uTurnRoute = {
      geometry: { coordinates: [[106.68, 10.76], [106.70, 10.74]] },
      legs: [
        {
          steps: [
            { maneuver: { modifier: 'straight', bearing_before: 45, bearing_after: 45 }, name: 'Đường Số 3' },
            { maneuver: { modifier: 'arrive', bearing_before: 50, bearing_after: 50 }, name: 'Đường Số 3' },
          ],
        },
        {
          steps: [
            { maneuver: { modifier: 'depart', bearing_before: 230, bearing_after: 230 }, name: 'Đường Số 3' },
            { maneuver: { modifier: 'arrive', bearing_before: 230, bearing_after: 230 }, name: 'Nguyễn Thị Thập' },
          ],
        },
      ],
    };
    expect(isRouteInvalidSpur(uTurnRoute)).toBe(true);

    // Route entering a narrow dead-end alley (Hẻm ...)
    const alleyRoute = {
      geometry: { coordinates: [[106.68, 10.76], [106.70, 10.74]] },
      legs: [
        {
          steps: [
            { maneuver: { modifier: 'turn', bearing_before: 90, bearing_after: 90 }, name: 'Hẻm 793/49 Trần Xuân Soạn' },
            { maneuver: { modifier: 'arrive', bearing_before: 90, bearing_after: 90 }, name: 'Hẻm 793/49 Trần Xuân Soạn' },
          ],
        },
        {
          steps: [
            { maneuver: { modifier: 'depart', bearing_before: 95, bearing_after: 95 }, name: 'Hẻm 793 Trần Xuân Soạn' },
            { maneuver: { modifier: 'arrive', bearing_before: 95, bearing_after: 95 }, name: 'Trần Xuân Soạn' },
          ],
        },
      ],
    };
    expect(isRouteInvalidSpur(alleyRoute)).toBe(true);
  });
});
