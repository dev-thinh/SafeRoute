import { describe, it, expect, afterAll } from 'vitest';
import { pool } from '../src/db/pool';
import { findNearestVertex, findPgRoutingSafeRoute } from '../src/services/pgRoutingService';
import { FloodEvent, Coordinate } from '../src/types';

describe('pgRouting Service', () => {
  afterAll(async () => {
    // Avoid hanging vitest worker
  });

  it('should find nearest vertex for valid HCMC coordinate', async () => {
    const coord: Coordinate = { lat: 10.7485, lng: 106.7082 };
    const vertex = await findNearestVertex(coord);
    expect(vertex).not.toBeNull();
    expect(vertex?.id).toBeDefined();
    expect(vertex?.distMeters).toBeLessThan(100);
  });

  it('should return null for coordinates far outside HCMC coverage', async () => {
    const hanoiCoord: Coordinate = { lat: 21.0285, lng: 105.8542 };
    const vertex = await findNearestVertex(hanoiCoord);
    expect(vertex).toBeNull();
  });

  it('should calculate fastest route and safe route bypassing flood', async () => {
    const origin: Coordinate = { lat: 10.7485, lng: 106.7082 };
    const destination: Coordinate = { lat: 10.7550, lng: 106.7150 };

    const event: FloodEvent = {
      id: '1',
      title: 'Điểm ngập thử nghiệm',
      sourceType: 'admin_manual',
      cause: 'high_tide',
      streetName: 'Trần Xuân Soạn',
      district: 'Quận 7',
      city: 'TP.HCM',
      startTime: new Date('2026-10-02T00:00:00Z'),
      peakTime: new Date('2026-10-02T02:00:00Z'),
      endTime: new Date('2026-10-02T04:00:00Z'),
      estimatedDepthCm: 45,
      confidenceScore: 1.0,
      geometry: { type: 'Point', coordinates: [106.7025, 10.7452] },
    };

    const result = await findPgRoutingSafeRoute(
      origin,
      destination,
      new Date('2026-10-02T02:00:00Z'),
      'motorbike',
      [event]
    );

    expect(result).not.toBeNull();
    expect(result?.fastestRoute).toBeDefined();
    expect(result?.safeRoute).toBeDefined();
    expect(result?.fastestRoute.geometry.coordinates.length).toBeGreaterThan(5);
    expect(result?.safeRoute.geometry.coordinates.length).toBeGreaterThan(5);
  });
});
