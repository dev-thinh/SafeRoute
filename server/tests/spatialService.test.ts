import { describe, it, expect } from 'vitest';
import { buildHazardMultiPolygonFromEvents } from '../src/services/spatialService';
import { FloodEvent } from '../src/types';

describe('SpatialService Polygon Union', () => {
  it('should generate buffered polygon from point flood event and union them', () => {
    const events: FloodEvent[] = [
      {
        id: '1',
        title: 'Điểm ngập A',
        sourceType: 'admin_manual',
        cause: 'high_tide',
        streetName: 'Trần Xuân Soạn',
        district: 'Quận 7',
        city: 'TP.HCM',
        startTime: new Date('2026-09-28T16:00:00Z'),
        peakTime: new Date('2026-09-28T17:30:00Z'),
        endTime: new Date('2026-09-28T19:00:00Z'),
        estimatedDepthCm: 45,
        confidenceScore: 1.0,
        geometry: { type: 'Point', coordinates: [106.702, 10.745] },
      },
    ];

    const targetTime = new Date('2026-09-28T17:30:00Z');
    const hazardPolygon = buildHazardMultiPolygonFromEvents(events, targetTime, 'motorbike');
    expect(hazardPolygon).not.toBeNull();
    expect(hazardPolygon?.type).toBe('MultiPolygon');
    expect(hazardPolygon?.coordinates.length).toBeGreaterThan(0);
  });
});
