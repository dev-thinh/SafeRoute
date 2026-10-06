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

interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failuresCount: number;
  lastFailureTime: number;
  cooldownMs: number;
}

export const circuitBreaker: CircuitBreakerState = {
  state: 'CLOSED',
  failuresCount: 0,
  lastFailureTime: 0,
  cooldownMs: 5 * 60 * 1000, // 5 minutes cooldown window
};

export function resetCircuitBreaker() {
  circuitBreaker.state = 'CLOSED';
  circuitBreaker.failuresCount = 0;
  circuitBreaker.lastFailureTime = 0;
}

async function callModelWithRetry(
  genAI: GoogleGenerativeAI,
  modelName: string,
  prompt: string,
  maxRetries = 2
): Promise<string> {
  let attempt = 0;
  while (true) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err: any) {
      const isTransient =
        err?.status === 429 ||
        err?.message?.includes('429') ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.message?.includes('503') ||
        err?.code === 'ETIMEDOUT';

      if (attempt < maxRetries && isTransient) {
        attempt++;
        const backoffMs = Math.round(1500 * Math.pow(2, attempt - 1) + Math.random() * 500);
        console.warn(`[Gemini AI] Model ${modelName} transient rate limit/error, retry ${attempt}/${maxRetries} after ${backoffMs}ms...`);
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
      throw err;
    }
  }
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

  const primaryModel = ENV.GEMINI_MODEL || 'gemini-3-pro';
  const fallbackModels = [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
  ].filter((m) => m !== primaryModel);

  // 1. Evaluate Circuit Breaker State
  const now = Date.now();
  if (circuitBreaker.state === 'OPEN') {
    if (now - circuitBreaker.lastFailureTime >= circuitBreaker.cooldownMs) {
      console.log(`[Circuit Breaker] Cooldown expired. Moving to HALF_OPEN to probe primary model ${primaryModel}...`);
      circuitBreaker.state = 'HALF_OPEN';
    } else {
      console.log(`[Circuit Breaker] Primary model ${primaryModel} in OPEN cooldown. Fast-pathing to Flash fallback...`);
    }
  }

  // 2. Try Primary Model (when CLOSED or probing in HALF_OPEN)
  if (circuitBreaker.state === 'CLOSED' || circuitBreaker.state === 'HALF_OPEN') {
    try {
      const text = await callModelWithRetry(genAI, primaryModel, prompt, 2);
      if (circuitBreaker.state === 'HALF_OPEN') {
        console.log(`[Circuit Breaker] Probe to ${primaryModel} SUCCEEDED! Restoring state to CLOSED.`);
        circuitBreaker.state = 'CLOSED';
        circuitBreaker.failuresCount = 0;
      }
      return parseGeminiExtractionResponse(text || '{}');
    } catch (err: any) {
      circuitBreaker.failuresCount++;
      console.warn(`[Circuit Breaker] Primary model ${primaryModel} failed (failure #${circuitBreaker.failuresCount}):`, err?.message);
      
      // Trip circuit breaker to OPEN on persistent failure
      if (circuitBreaker.failuresCount >= 2 || err?.status === 429 || err?.message?.includes('RESOURCE_EXHAUSTED')) {
        circuitBreaker.state = 'OPEN';
        circuitBreaker.lastFailureTime = Date.now();
        console.warn(`[Circuit Breaker] TRIPPED to OPEN. Cooldown for ${circuitBreaker.cooldownMs / 1000}s. Routing to fallback models.`);
      }
    }
  }

  // 3. Try Fallback Flash Models
  for (const fallbackModel of fallbackModels) {
    try {
      console.log(`[Gemini AI] Trying fallback model ${fallbackModel}...`);
      const text = await callModelWithRetry(genAI, fallbackModel, prompt, 1);
      return parseGeminiExtractionResponse(text || '{}');
    } catch (fbErr: any) {
      console.warn(`[Gemini AI] Fallback model ${fallbackModel} failed:`, fbErr?.message);
    }
  }

  // 4. Final safety net: Rule-based NLP extraction
  console.warn('[Gemini AI] All AI models unavailable. Falling back to rule-based NLP extraction.');
  return extractWithRuleBasedFallback(articleText);
}
