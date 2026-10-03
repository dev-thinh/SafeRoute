import { describe, it, expect } from 'vitest';
import { parseGeminiExtractionResponse } from '../src/services/geminiExtractor';

describe('Gemini News Extraction Parser', () => {
  it('should parse valid structured JSON from AI output', () => {
    const mockAiJson = JSON.stringify({
      article_type: 'forecast_warning',
      summary: 'Dự báo triều cường gây ngập đường Trần Xuân Soạn Quận 7 trong các ngày tới',
      cause: 'high_tide',
      confidence_overall: 0.95,
      locations: [
        {
          street_name: 'Trần Xuân Soạn',
          district: 'Quận 7',
          city: 'TP. Hồ Chí Minh',
          estimated_depth_cm: 45,
          start_time: '2026-10-04T16:00:00+07:00',
          peak_time: '2026-10-04T17:30:00+07:00',
          end_time: '2026-10-04T19:00:00+07:00',
          is_future_forecast: true,
          confidence: 0.9,
        },
      ],
    });

    const parsed = parseGeminiExtractionResponse(mockAiJson);
    expect(parsed.article_type).toBe('forecast_warning');
    expect(parsed.locations.length).toBe(1);
    expect(parsed.locations[0].street_name).toBe('Trần Xuân Soạn');
    expect(parsed.locations[0].estimated_depth_cm).toBe(45);
    expect(parsed.locations[0].is_future_forecast).toBe(true);
  });
});
