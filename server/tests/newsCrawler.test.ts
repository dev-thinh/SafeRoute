import { describe, it, expect, beforeEach } from 'vitest';
import {
  getActiveNewsFloodEvents,
  crawledArticlesStore,
  calculateHistoricalPriorRisk,
  HCMC_GEO_KEYWORDS,
  EXCLUSION_KEYWORDS,
  STREET_INDICATORS,
  reanalyzeFallbackArticlesWithGemini,
  shouldMarkArticleForGeminiReanalysis,
} from '../src/services/newsCrawler';
import { noteProviderFailureForTest, resetCircuitBreaker } from '../src/services/geminiExtractor';
import { selectArticlesNeedingGeminiReanalysis } from '../src/db/newsRepo';
import { FloodEvent } from '../src/types';

describe('Smart News Crawler & Deduplication', () => {
  beforeEach(() => {
    resetCircuitBreaker();
  });

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

  it('should identify valid HCMC geographic references and reject non-HCMC references', () => {
    const validHcmc = 'Mưa lớn ngập nhiều nơi tại TP.HCM chiều tối';
    const nonHcmc = 'Mưa lớn tại miền Bắc và lũ quét ở Đồng Nai';

    const isHcmcValid = HCMC_GEO_KEYWORDS.some((kw: string) => validHcmc.toLowerCase().includes(kw));
    const isNonHcmcValid = HCMC_GEO_KEYWORDS.some((kw: string) => nonHcmc.toLowerCase().includes(kw));

    expect(isHcmcValid).toBe(true);
    expect(isNonHcmcValid).toBe(false);
  });

  it('should exclude airport, flight, and conference topics via blacklist', () => {
    const flightTitle = 'Mưa lớn khiến hàng loạt chuyến bay không thể đáp Tân Sơn Nhất';
    const normalTitle = 'Đường Phan Huy Ích ngập sâu trong mưa lớn';

    const isFlightExcluded = EXCLUSION_KEYWORDS.some((kw: string) => flightTitle.toLowerCase().includes(kw));
    const isNormalExcluded = EXCLUSION_KEYWORDS.some((kw: string) => normalTitle.toLowerCase().includes(kw));

    expect(isFlightExcluded).toBe(true);
    expect(isNormalExcluded).toBe(false);
  });

  it('should verify street indicators exist before invoking AI extraction', () => {
    const textWithStreet = 'Ghi nhận tại đường Phan Huy Ích nước dâng cao hơn 50cm';
    const textGeneral = 'Tình hình thời tiết diễn biến phức tạp, lượng mưa đo được rất cao';

    const hasStreet1 = STREET_INDICATORS.some((ind: string) => textWithStreet.toLowerCase().includes(ind));
    const hasStreet2 = STREET_INDICATORS.some((ind: string) => textGeneral.toLowerCase().includes(ind));

    expect(hasStreet1).toBe(true);
    expect(hasStreet2).toBe(false);
  });

  it('should calculate historical prior risk based on past news mentions', () => {
    // Trần Xuân Soạn is seeded in crawledArticlesStore
    const risk = calculateHistoricalPriorRisk('Trần Xuân Soạn');
    expect(risk).toBeGreaterThanOrEqual(1.10);

    // An unknown street should have default base multiplier 1.0
    const unknownRisk = calculateHistoricalPriorRisk('Đường Hoàn Toàn Mới Lạ 123');
    expect(unknownRisk).toBe(1.0);
  });
  it('should mark Groq and rule-based extractions for later Gemini reanalysis', () => {
    expect(shouldMarkArticleForGeminiReanalysis('groq')).toBe(true);
    expect(shouldMarkArticleForGeminiReanalysis('rule_based')).toBe(true);
    expect(shouldMarkArticleForGeminiReanalysis('gemini')).toBe(false);
  });

  it('should select only fallback-derived articles that still need Gemini reanalysis', () => {
    const now = new Date().toISOString();
    const candidates = selectArticlesNeedingGeminiReanalysis(
      [
        {
          id: 'a1',
          source: 'VnExpress',
          title: 'Fallback Groq article',
          url: 'https://example.com/a1',
          publishedAt: now,
          crawledAt: now,
          summary: 'fallback',
          cause: 'combined',
          extractedLocations: [],
          contentSnippet: 'content',
          extractionProvider: 'groq',
          needsGeminiReanalysis: true,
          geminiReanalysisAttempts: 1,
        },
        {
          id: 'a2',
          source: 'VnExpress',
          title: 'Gemini article',
          url: 'https://example.com/a2',
          publishedAt: now,
          crawledAt: now,
          summary: 'primary',
          cause: 'combined',
          extractedLocations: [],
          contentSnippet: 'content',
          extractionProvider: 'gemini',
          needsGeminiReanalysis: false,
          geminiReanalysisAttempts: 0,
        },
        {
          id: 'a3',
          source: 'VnExpress',
          title: 'Exhausted fallback article',
          url: 'https://example.com/a3',
          publishedAt: now,
          crawledAt: now,
          summary: 'fallback',
          cause: 'combined',
          extractedLocations: [],
          contentSnippet: 'content',
          extractionProvider: 'rule_based',
          needsGeminiReanalysis: true,
          geminiReanalysisAttempts: 3,
        },
      ],
      10
    );

    expect(candidates.map((a) => a.id)).toEqual(['a1']);
  });

  it('should skip Gemini reanalysis batch while Gemini circuit breaker is open', async () => {
    noteProviderFailureForTest(
      'Gemini',
      'gemini-3.8-flash',
      Object.assign(new Error('Quota exceeded [{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"60s"}]'), {
        status: 429,
      })
    );

    const result = await reanalyzeFallbackArticlesWithGemini(5);

    expect(result).toEqual({ attempted: 0, upgraded: 0, skipped: 5 });
  });
});


