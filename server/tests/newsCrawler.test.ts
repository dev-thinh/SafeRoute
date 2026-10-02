import { describe, it, expect } from 'vitest';
import {
  getActiveNewsFloodEvents,
  crawledArticlesStore,
} from '../src/services/newsCrawler';
import { FloodEvent } from '../src/types';

describe('Smart News Crawler & Deduplication', () => {
  it('should maintain initial seeded news articles', () => {
    expect(crawledArticlesStore.length).toBeGreaterThanOrEqual(4);
  });

  it('should filter out news flood obstacles that have expired beyond 3 hours', () => {
    const now = new Date('2026-10-02T12:00:00Z');

    const freshEvent: FloodEvent = {
      id: 'fresh-1',
      title: 'Ngập đường Võ Văn Ngân',
      sourceType: 'news_crawler',
      cause: 'heavy_rain',
      streetName: 'Võ Văn Ngân',
      district: 'TP. Thủ Đức',
      city: 'TP. Hồ Chí Minh',
      startTime: new Date('2026-10-02T11:00:00Z'),
      peakTime: new Date('2026-10-02T11:30:00Z'),
      endTime: new Date('2026-10-02T14:00:00Z'), // expires in 2 hours
      estimatedDepthCm: 45,
      confidenceScore: 0.9,
      geometry: { type: 'Point', coordinates: [106.7570, 10.8520] },
    };

    const expiredEvent: FloodEvent = {
      id: 'expired-1',
      title: 'Ngập đường Trần Xuân Soạn sáng sớm',
      sourceType: 'news_crawler',
      cause: 'high_tide',
      streetName: 'Trần Xuân Soạn',
      district: 'Quận 7',
      city: 'TP. Hồ Chí Minh',
      startTime: new Date('2026-10-02T05:00:00Z'),
      peakTime: new Date('2026-10-02T06:00:00Z'),
      endTime: new Date('2026-10-02T08:00:00Z'), // expired 4 hours ago
      estimatedDepthCm: 50,
      confidenceScore: 0.95,
      geometry: { type: 'Point', coordinates: [106.7082, 10.7485] },
    };

    const nonNewsEvent: FloodEvent = {
      id: 'tide-1',
      title: 'Triều cường chiều',
      sourceType: 'tide_forecast',
      cause: 'high_tide',
      streetName: 'Lê Văn Lương',
      district: 'Quận 7',
      city: 'TP. Hồ Chí Minh',
      startTime: new Date('2026-10-02T05:00:00Z'),
      peakTime: new Date('2026-10-02T06:00:00Z'),
      endTime: new Date('2026-10-02T08:00:00Z'),
      estimatedDepthCm: 35,
      confidenceScore: 0.9,
      geometry: { type: 'Point', coordinates: [106.7011, 10.7412] },
    };

    const activeEvents = getActiveNewsFloodEvents(
      [freshEvent, expiredEvent, nonNewsEvent],
      now
    );

    expect(activeEvents.some((e) => e.id === 'fresh-1')).toBe(true);
    expect(activeEvents.some((e) => e.id === 'expired-1')).toBe(false); // Expired news obstacle filtered
    expect(activeEvents.some((e) => e.id === 'tide-1')).toBe(true); // Non-news untouched by news decay
  });
});
