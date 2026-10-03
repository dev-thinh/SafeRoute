import { GoogleGenerativeAI } from '@google/generative-ai';
import { ENV } from '../config/env';

export interface ExtractedLocation {
  street_name: string;
  district: string;
  city: string;
  estimated_depth_cm: number;
  start_time: string;
  peak_time: string;
  end_time: string;
  is_future_forecast?: boolean;
  confidence: number;
}

export interface ExtractedFloodData {
  article_type: 'forecast_warning' | 'incident_report';
  summary: string;
  cause: 'high_tide' | 'heavy_rain' | 'combined';
  confidence_overall: number;
  locations: ExtractedLocation[];
}

export function parseGeminiExtractionResponse(rawText: string): ExtractedFloodData {
  const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return {
    article_type: parsed.article_type || 'incident_report',
    summary: parsed.summary || '',
    cause: parsed.cause || 'combined',
    confidence_overall: parsed.confidence_overall ?? 0.85,
    locations: parsed.locations || [],
  };
}

import { HCMC_VULNERABLE_CORRIDORS } from './vulnerableRoads';

export function extractWithRuleBasedFallback(articleText: string): ExtractedFloodData {
  const matchedLocations: ExtractedLocation[] = [];
  const textLower = articleText.toLowerCase();

  const isRain = textLower.includes('mưa') || textLower.includes('dông');
  const isTide = textLower.includes('triều cường') || textLower.includes('thủy triều') || textLower.includes('triều dâng');
  const cause: 'high_tide' | 'heavy_rain' | 'combined' =
    isRain && isTide ? 'combined' : isTide ? 'high_tide' : 'heavy_rain';

  const isForecast =
    textLower.includes('dự báo') ||
    textLower.includes('cảnh báo') ||
    textLower.includes('sắp tới') ||
    textLower.includes('khả năng ngập');
  const article_type = isForecast ? 'forecast_warning' : 'incident_report';

  for (const corridor of HCMC_VULNERABLE_CORRIDORS) {
    if (textLower.includes(corridor.streetName.toLowerCase())) {
      matchedLocations.push({
        street_name: corridor.streetName,
        district: corridor.district,
        city: corridor.city,
        estimated_depth_cm: corridor.baseDepthCm,
        start_time: new Date().toISOString(),
        peak_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        is_future_forecast: isForecast,
        confidence: 0.85,
      });
    }
  }

  const summary =
    matchedLocations.length > 0
      ? `Trích xuất tự động qua phân tích từ khóa: Ghi nhận ngập tại ${matchedLocations.map((l) => l.street_name).slice(0, 3).join(', ')} do ${cause === 'high_tide' ? 'triều cường' : cause === 'heavy_rain' ? 'mưa lớn' : 'triều kết hợp mưa'}.`
      : `Bản tin khí tượng ngập lụt TP.HCM do ${cause === 'high_tide' ? 'triều cường' : 'mưa lớn'}.`;

  return {
    article_type,
    summary,
    cause,
    confidence_overall: 0.8,
    locations: matchedLocations,
  };
}

export async function extractFloodEventsWithGemini(articleText: string): Promise<ExtractedFloodData> {
  if (!ENV.GEMINI_API_KEY) {
    return extractWithRuleBasedFallback(articleText);
  }

  const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
  const prompt = `Bạn là trợ lý AI chuyên phân tích tin tức ngập lụt, triều cường và thời tiết tại TP. Hồ Chí Minh.
Hãy phân loại bài viết và trích xuất danh sách các điểm ngập dưới định dạng JSON đúng theo schema:
{
  "article_type": "forecast_warning" hoặc "incident_report", // "forecast_warning" nếu bài báo cảnh báo ngập/mưa/triều trong tương lai; "incident_report" nếu bài báo tường thuật sự việc đang/đã ngập
  "summary": string,
  "cause": "high_tide" | "heavy_rain" | "combined",
  "confidence_overall": number,
  "locations": [
    {
      "street_name": string,
      "district": string,
      "city": string,
      "estimated_depth_cm": number,
      "start_time": string, // ISO format
      "peak_time": string,  // ISO format
      "end_time": string,   // ISO format
      "is_future_forecast": boolean, // true nếu dự báo sự kiện sắp tới
      "confidence": number
    }
  ]
}

Nội dung bài viết:
${articleText}`;

  const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return parseGeminiExtractionResponse(text || '{}');
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  console.warn('Gemini AI extraction quota exceeded or unavailable. Falling back to rule-based NLP extraction:', lastError?.message);
  return extractWithRuleBasedFallback(articleText);
}
