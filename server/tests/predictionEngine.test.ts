import { describe, it, expect } from 'vitest';
import {
  calculateTidalDepth,
  calculateRainDepth,
  calculateReportConfidence,
  isHazardActive,
} from '../src/services/predictionEngine';
import { FloodEvent, UserReport } from '../src/types';

describe('PredictionEngine Mathematical Functions', () => {
  const baseTideEvent: FloodEvent = {
    id: '1',
    title: 'Triều cường Trần Xuân Soạn',
    sourceType: 'news_crawler',
    cause: 'high_tide',
    streetName: 'Trần Xuân Soạn',
    district: 'Quận 7',
    city: 'TP. Hồ Chí Minh',
    startTime: new Date('2026-09-28T16:00:00Z'),
    peakTime: new Date('2026-09-28T17:30:00Z'),
    endTime: new Date('2026-09-28T19:00:00Z'),
    estimatedDepthCm: 40,
    confidenceScore: 0.9,
    geometry: { type: 'Point', coordinates: [106.70, 10.74] },
  };

  it('calculateTidalDepth should return 0 outside of start and end times', () => {
    const beforeStart = new Date('2026-09-28T15:00:00Z');
    const afterEnd = new Date('2026-09-28T20:00:00Z');
    expect(calculateTidalDepth(baseTideEvent, beforeStart)).toBe(0);
    expect(calculateTidalDepth(baseTideEvent, afterEnd)).toBe(0);
  });

  it('calculateTidalDepth should reach maximum depth at peak time using half-sine model', () => {
    const atPeak = new Date('2026-09-28T17:30:00Z');
    const depth = calculateTidalDepth(baseTideEvent, atPeak);
    expect(Math.round(depth)).toBe(40);
  });

  it('calculateTidalDepth should smoothly interpolate at quarter and three-quarter times', () => {
    const quarterTime = new Date('2026-09-28T16:45:00Z');
    const depth = calculateTidalDepth(baseTideEvent, quarterTime);
    expect(Math.round(depth)).toBe(20);
  });

  it('calculateRainDepth should follow triangular hydrograph', () => {
    const rainEvent: FloodEvent = {
      ...baseTideEvent,
      cause: 'heavy_rain',
      startTime: new Date('2026-09-28T14:00:00Z'),
      peakTime: new Date('2026-09-28T14:30:00Z'),
      endTime: new Date('2026-09-28T15:30:00Z'),
      estimatedDepthCm: 30,
    };
    expect(calculateRainDepth(rainEvent, new Date('2026-09-28T14:30:00Z'))).toBe(30);
    expect(calculateRainDepth(rainEvent, new Date('2026-09-28T15:00:00Z'))).toBe(15);
  });

  it('calculateReportConfidence should decay exponentially and weigh upvotes/downvotes', () => {
    const report: UserReport = {
      id: 'r1',
      coordinate: { lat: 10.74, lng: 106.70 },
      depthLevel: 'wheel',
      depthCm: 30,
      reportedAt: new Date('2026-09-28T12:00:00Z'),
      upvotes: 3,
      downvotes: 0,
      status: 'active',
    };
    const freshConfidence = calculateReportConfidence(report, new Date('2026-09-28T12:00:00Z'));
    expect(freshConfidence).toBeGreaterThan(0.6);

    const oldConfidence = calculateReportConfidence(report, new Date('2026-09-28T15:00:00Z'));
    expect(oldConfidence).toBeLessThan(0.4);
  });

  it('isHazardActive should correctly distinguish motorbike vs car clearance thresholds', () => {
    expect(isHazardActive(22, 0.8, 'motorbike')).toBe(true);
    expect(isHazardActive(22, 0.8, 'car')).toBe(false);
  });
});
