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

export async function extractFloodEventsWithGemini(articleText: string): Promise<ExtractedFloodData> {
  if (!ENV.GEMINI_API_KEY) {
    // Mock response when API key is not configured for local development
    return {
      article_type: 'forecast_warning',
      summary: 'Dự báo triều cường gây ngập đường Trần Xuân Soạn',
      cause: 'high_tide',
      confidence_overall: 0.9,
      locations: [
        {
          street_name: 'Trần Xuân Soạn',
          district: 'Quận 7',
          city: 'TP. Hồ Chí Minh',
          estimated_depth_cm: 40,
          start_time: new Date(Date.now() + 2 * 3600000).toISOString(),
          peak_time: new Date(Date.now() + 3.5 * 3600000).toISOString(),
          end_time: new Date(Date.now() + 5 * 3600000).toISOString(),
          is_future_forecast: true,
          confidence: 0.9,
        },
      ],
    };
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

  const candidateModels = ['gemini-3.5-flash', 'gemini-3.8-flash'];
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

  console.warn('Gemini AI extraction failed with all candidate models:', lastError?.message);
  return {
    article_type: 'incident_report',
    summary: 'Không thể phân tích tự động bài báo qua AI',
    cause: 'combined',
    confidence_overall: 0.5,
    locations: [],
  };
}
