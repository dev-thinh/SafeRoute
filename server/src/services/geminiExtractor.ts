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
  confidence: number;
}

export interface ExtractedFloodData {
  summary: string;
  cause: 'high_tide' | 'heavy_rain' | 'combined';
  confidence_overall: number;
  locations: ExtractedLocation[];
}

export function parseGeminiExtractionResponse(rawText: string): ExtractedFloodData {
  const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}

export async function extractFloodEventsWithGemini(articleText: string): Promise<ExtractedFloodData> {
  if (!ENV.GEMINI_API_KEY) {
    // Mock response when API key is not configured for local development
    return {
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
          confidence: 0.9,
        },
      ],
    };
  }

  const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const prompt = `Bạn là trợ lý AI chuyên phân tích tin tức ngập lụt, triều cường và thời tiết tại TP. Hồ Chí Minh.
Hãy trích xuất danh sách các điểm ngập từ bài viết sau đây dưới định dạng JSON đúng theo schema:
{
  "summary": string,
  "cause": "high_tide" | "heavy_rain" | "combined",
  "confidence_overall": number,
  "locations": [
    {
      "street_name": string,
      "district": string,
      "city": string,
      "estimated_depth_cm": number,
      "start_time": string (ISO 8601),
      "peak_time": string (ISO 8601),
      "end_time": string (ISO 8601),
      "confidence": number
    }
  ]
}

Nội dung bài viết:
${articleText}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseGeminiExtractionResponse(text || '{}');
}
