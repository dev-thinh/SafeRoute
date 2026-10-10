import { describe, it, expect } from 'vitest';
import { evaluateMultiSourceHotspots } from '../src/services/vulnerableRoads';
import { getActiveNewsFloodEvents } from '../src/services/newsCrawler';
import { ENV } from '../src/config/env';
import { FloodEvent } from '../src/types';

describe('Flood Detection & Rain Calibration Integration Tests', () => {
  it('should use gemini-3.8-flash as the default Gemini model', () => {
    expect(ENV.GEMINI_MODEL).toBe('gemini-3.8-flash');
  });

  it('should detect flood hotspots when realistic Open-Meteo convective rain (e.g. 1.8mm) occurs', () => {
    const targetDate = new Date();
    // In Open-Meteo, 1.8mm/h corresponds to a heavy local tropical convective shower
    const rainByQuadrant: any = {
      center: { currentMm: 0, prev1hMm: 0, prev2hMm: 0, effectiveAccumulationMm: 0, rainProbability: 0 },
      south: { currentMm: 0, prev1hMm: 0, prev2hMm: 0, effectiveAccumulationMm: 0, rainProbability: 0 },
      east: { currentMm: 0, prev1hMm: 0, prev2hMm: 0, effectiveAccumulationMm: 0, rainProbability: 0 },
      northwest: { currentMm: 1.8, prev1hMm: 1.2, prev2hMm: 0.5, effectiveAccumulationMm: 2.8, rainProbability: 0.4 },
    };

    // When evaluated across corridors in northwest (e.g. Nguyễn Văn Khối with threshold 25mm)
    const activeHotspots = evaluateMultiSourceHotspots(targetDate, rainByQuadrant, false);
    expect(activeHotspots.length).toBeGreaterThan(0);

    const nguyenVanKhoi = activeHotspots.find((e) => e.streetName === 'Nguyễn Văn Khối');
    expect(nguyenVanKhoi).toBeDefined();
    expect(nguyenVanKhoi!.estimatedDepthCm).toBeGreaterThanOrEqual(15);
  });

  it('should keep news flood events active within extended 18h window', () => {
    const now = new Date('2026-10-09T12:00:00Z');
    // Article published 8 hours ago (yesterday afternoon/evening)
    const eightHoursAgo = new Date(now.getTime() - 8 * 3600 * 1000);
    const tenHoursLater = new Date(eightHoursAgo.getTime() + 18 * 3600 * 1000); // end is in 10h

    const recentFlood: FloodEvent = {
      id: 'recent-1',
      title: 'Mưa lớn ngập đường Nguyễn Văn Quá chiều qua',
      sourceType: 'news_crawler',
      cause: 'heavy_rain',
      streetName: 'Nguyễn Văn Quá',
      district: 'Quận 12',
      city: 'TP. Hồ Chí Minh',
      startTime: eightHoursAgo,
      peakTime: new Date(eightHoursAgo.getTime() + 30 * 60 * 1000),
      endTime: tenHoursLater,
      estimatedDepthCm: 40,
      confidenceScore: 0.9,
      geometry: { type: 'Point', coordinates: [106.6273, 10.8415] },
    };

    const activeEvents = getActiveNewsFloodEvents([recentFlood], now);
    expect(activeEvents).toHaveLength(1);
    expect(activeEvents[0].streetName).toBe('Nguyễn Văn Quá');
  });
});
