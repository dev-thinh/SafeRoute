import { GoogleGenerativeAI } from '@google/generative-ai';
import { ENV } from '../config/env';
import { HCMC_VULNERABLE_CORRIDORS } from './vulnerableRoads';

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
  extractionProvider?: 'gemini' | 'groq' | 'rule_based';
  extractionModel?: string;
  extractionQuality?: 'primary' | 'fallback_ai' | 'rule_based';
  needsGeminiReanalysis?: boolean;
}

interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failuresCount: number;
  lastFailureTime: number;
  cooldownMs: number;
}

type ProviderName = 'Gemini' | 'Groq';
const BASE_CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000;

function createCircuitBreaker(): CircuitBreakerState {
  return {
    state: 'CLOSED',
    failuresCount: 0,
    lastFailureTime: 0,
    cooldownMs: BASE_CIRCUIT_BREAKER_COOLDOWN_MS,
  };
}

export const geminiCircuitBreaker: CircuitBreakerState = createCircuitBreaker();
export const groqCircuitBreaker: CircuitBreakerState = createCircuitBreaker();
export const circuitBreaker = geminiCircuitBreaker;

const providerCircuitBreakers: Record<ProviderName, CircuitBreakerState> = {
  Gemini: geminiCircuitBreaker,
  Groq: groqCircuitBreaker,
};

const floodExtractionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    article_type: { type: 'string', enum: ['forecast_warning', 'incident_report'] },
    summary: { type: 'string' },
    cause: { type: 'string', enum: ['high_tide', 'heavy_rain', 'combined'] },
    confidence_overall: { type: 'number' },
    locations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          street_name: { type: 'string' },
          district: { type: 'string' },
          city: { type: 'string' },
          estimated_depth_cm: { type: 'number' },
          start_time: { type: 'string' },
          peak_time: { type: 'string' },
          end_time: { type: 'string' },
          is_future_forecast: { type: 'boolean' },
          confidence: { type: 'number' },
        },
        required: [
          'street_name',
          'district',
          'city',
          'estimated_depth_cm',
          'start_time',
          'peak_time',
          'end_time',
          'is_future_forecast',
          'confidence',
        ],
      },
    },
  },
  required: ['article_type', 'summary', 'cause', 'confidence_overall', 'locations'],
};

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

export function extractWithRuleBasedFallback(articleText: string): ExtractedFloodData {
  const matchedLocations: ExtractedLocation[] = [];
  const textLower = articleText.toLowerCase();

  const isRain =
    textLower.includes('mưa') ||
    textLower.includes('mua') ||
    textLower.includes('dông') ||
    textLower.includes('dong');
  const isTide =
    textLower.includes('triều cường') ||
    textLower.includes('trieu cuong') ||
    textLower.includes('thủy triều') ||
    textLower.includes('thuy trieu') ||
    textLower.includes('triều dâng') ||
    textLower.includes('trieu dang');
  const cause: 'high_tide' | 'heavy_rain' | 'combined' =
    isRain && isTide ? 'combined' : isTide ? 'high_tide' : 'heavy_rain';

  const isForecast =
    textLower.includes('dự báo') ||
    textLower.includes('du bao') ||
    textLower.includes('cảnh báo') ||
    textLower.includes('canh bao') ||
    textLower.includes('sắp tới') ||
    textLower.includes('sap toi') ||
    textLower.includes('khả năng ngập') ||
    textLower.includes('kha nang ngap');
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
      ? `Trích xuất tự động qua phân tích từ khóa: ghi nhận ngập tại ${matchedLocations
          .map((l) => l.street_name)
          .slice(0, 3)
          .join(', ')} do ${cause === 'high_tide' ? 'triều cường' : cause === 'heavy_rain' ? 'mưa lớn' : 'triều kết hợp mưa'}.`
      : `Bản tin khí tượng ngập lụt TP.HCM do ${cause === 'high_tide' ? 'triều cường' : 'mưa lớn'}.`;

  return {
    article_type,
    summary,
    cause,
    confidence_overall: 0.8,
    locations: matchedLocations,
    extractionProvider: 'rule_based',
    extractionModel: 'rule-based-keyword-corridor',
    extractionQuality: 'rule_based',
    needsGeminiReanalysis: true,
  };
}

function resetOneCircuitBreaker(breaker: CircuitBreakerState) {
  breaker.state = 'CLOSED';
  breaker.failuresCount = 0;
  breaker.lastFailureTime = 0;
  breaker.cooldownMs = BASE_CIRCUIT_BREAKER_COOLDOWN_MS;
}

export function resetCircuitBreaker() {
  resetOneCircuitBreaker(geminiCircuitBreaker);
  resetOneCircuitBreaker(groqCircuitBreaker);
}

function isTransientModelError(err: any): boolean {
  const status = err?.status;
  const message = String(err?.message || '');
  return (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes('ETIMEDOUT') ||
    message.includes('ECONNRESET') ||
    message.includes('fetch failed')
  );
}

function isQuotaExhaustedError(err: any): boolean {
  const message = String(err?.message || '');
  return (
    err?.status === 429 ||
    message.includes('GenerateRequestsPerDayPerProjectPerModel') ||
    message.includes('generate_content_free_tier_requests') ||
    message.includes('Quota exceeded') ||
    message.includes('RESOURCE_EXHAUSTED')
  );
}

function isPermanentProviderConfigError(err: any): boolean {
  const status = err?.status;
  const message = String(err?.message || '');
  return (
    status === 401 ||
    status === 403 ||
    status === 404 ||
    message.includes('API key not valid') ||
    message.includes('invalid_api_key') ||
    message.includes('model_not_found') ||
    message.includes('does not exist or you do not have access')
  );
}

function shouldOpenCircuitBreaker(err: any): boolean {
  return isQuotaExhaustedError(err) || isPermanentProviderConfigError(err);
}

function getRetryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return seconds * 1000;
  }
  const dateMs = Date.parse(value);
  return Number.isFinite(dateMs) ? Math.max(0, dateMs - Date.now()) : undefined;
}

function getRetryAfterMsFromError(err: any): number | undefined {
  const explicitMs = err?.retryAfterMs;
  if (typeof explicitMs === 'number' && explicitMs > 0) {
    return explicitMs;
  }

  const message = String(err?.message || '');
  const retryDelayMatch = message.match(/"retryDelay"\s*:\s*"(\d+)s"/);
  if (retryDelayMatch) {
    return Number(retryDelayMatch[1]) * 1000;
  }

  const retryInMatch = message.match(/Please retry in (?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?/i);
  if (retryInMatch) {
    const hours = Number(retryInMatch[1] || 0);
    const minutes = Number(retryInMatch[2] || 0);
    const seconds = Number(retryInMatch[3] || 0);
    return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
  }

  return undefined;
}

function getBackoffMs(attempt: number, retryAfterMs?: number): number {
  return retryAfterMs && retryAfterMs > 0
    ? retryAfterMs
    : Math.round(1500 * Math.pow(2, attempt - 1) + Math.random() * 500);
}

function shouldAttemptProvider(providerName: ProviderName, modelName: string): boolean {
  const breaker = providerCircuitBreakers[providerName];
  if (breaker.state !== 'OPEN') {
    return true;
  }

  if (Date.now() - breaker.lastFailureTime >= breaker.cooldownMs) {
    console.log(`[${providerName} Circuit Breaker] Cooldown expired. Probing ${modelName} in HALF_OPEN.`);
    breaker.state = 'HALF_OPEN';
    return true;
  }

  console.log(`[${providerName} Circuit Breaker] ${modelName} is in OPEN cooldown. Skipping provider.`);
  return false;
}

function recordProviderSuccess(providerName: ProviderName, modelName: string) {
  const breaker = providerCircuitBreakers[providerName];
  if (breaker.state === 'HALF_OPEN') {
    console.log(`[${providerName} Circuit Breaker] Probe to ${modelName} succeeded. Restoring CLOSED state.`);
  }
  breaker.state = 'CLOSED';
  breaker.failuresCount = 0;
  breaker.lastFailureTime = 0;
}

function recordProviderFailure(providerName: ProviderName, modelName: string, err: any) {
  const breaker = providerCircuitBreakers[providerName];
  breaker.failuresCount++;
  console.warn(`[${providerName} Circuit Breaker] ${modelName} failed (failure #${breaker.failuresCount}):`, err?.message);

  if (shouldOpenCircuitBreaker(err)) {
    breaker.state = 'OPEN';
    breaker.lastFailureTime = Date.now();
    const retryAfterMs = getRetryAfterMsFromError(err);
    if (retryAfterMs) {
      breaker.cooldownMs = Math.max(BASE_CIRCUIT_BREAKER_COOLDOWN_MS, retryAfterMs);
    }
    console.warn(`[${providerName} Circuit Breaker] TRIPPED to OPEN for ${breaker.cooldownMs / 1000}s.`);
  }
}

export function noteProviderFailureForTest(providerName: ProviderName, modelName: string, err: any) {
  recordProviderFailure(providerName, modelName, err);
}

export function isCircuitBreakerOpen(providerName: ProviderName): boolean {
  return providerCircuitBreakers[providerName].state === 'OPEN';
}

export function getCircuitBreakerCooldownMs(providerName: ProviderName): number {
  return providerCircuitBreakers[providerName].cooldownMs;
}

function withExtractionMetadata(
  data: ExtractedFloodData,
  metadata: Pick<ExtractedFloodData, 'extractionProvider' | 'extractionModel' | 'extractionQuality' | 'needsGeminiReanalysis'>
): ExtractedFloodData {
  return { ...data, ...metadata };
}

async function runProviderWithCircuitBreaker(
  providerName: ProviderName,
  modelName: string,
  callProvider: () => Promise<string>
): Promise<string | null> {
  if (!shouldAttemptProvider(providerName, modelName)) {
    return null;
  }

  try {
    const text = await callProvider();
    recordProviderSuccess(providerName, modelName);
    return text;
  } catch (err: any) {
    recordProviderFailure(providerName, modelName, err);
    return null;
  }
}

async function callGeminiWithRetry(
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
      if (attempt < maxRetries && isTransientModelError(err) && !isQuotaExhaustedError(err)) {
        attempt++;
        const backoffMs = getBackoffMs(attempt);
        console.warn(`[Gemini AI] ${modelName} transient error, retry ${attempt}/${maxRetries} after ${backoffMs}ms...`);
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
      throw err;
    }
  }
}

async function callGroqWithRetry(modelName: string, prompt: string, maxRetries = 2): Promise<string> {
  let attempt = 0;
  const url = `${ENV.GROQ_BASE_URL.replace(/\/+$/, '')}/chat/completions`;

  while (true) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ENV.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          temperature: 0,
          stream: false,
          messages: [
            {
              role: 'system',
              content: 'Extract HCMC flood news into strict JSON only. Do not include markdown.',
            },
            { role: 'user', content: prompt },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'saferoute_flood_extraction',
              schema: floodExtractionJsonSchema,
              strict: true,
            },
          },
        }),
      });

      if (!response.ok) {
        const retryAfterMs = getRetryAfterMs(response.headers.get('retry-after'));
        const errorText = await response.text().catch(() => '');
        const error = new Error(`Groq ${response.status}: ${errorText || response.statusText}`) as Error & {
          status?: number;
          retryAfterMs?: number;
        };
        error.status = response.status;
        error.retryAfterMs = retryAfterMs;
        throw error;
      }

      const json: any = await response.json();
      const content = json?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        throw new Error('Groq response did not include message content');
      }
      return content;
    } catch (err: any) {
      if (attempt < maxRetries && isTransientModelError(err)) {
        attempt++;
        const backoffMs = getBackoffMs(attempt, err?.retryAfterMs);
        console.warn(`[Groq AI] ${modelName} transient error, retry ${attempt}/${maxRetries} after ${backoffMs}ms...`);
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
      throw err;
    }
  }
}

function buildExtractionPrompt(articleText: string): string {
  return `Bạn là trợ lý AI chuyên phân tích tin tức ngập lụt, triều cường và thời tiết tại TP. Hồ Chí Minh.
Hãy phân loại bài viết và trích xuất danh sách các điểm ngập dưới định dạng JSON đúng theo schema:
{
  "article_type": "forecast_warning" hoặc "incident_report",
  "summary": string,
  "cause": "high_tide" | "heavy_rain" | "combined",
  "confidence_overall": number,
  "locations": [
    {
      "street_name": string,
      "district": string,
      "city": string,
      "estimated_depth_cm": number,
      "start_time": string,
      "peak_time": string,
      "end_time": string,
      "is_future_forecast": boolean,
      "confidence": number
    }
  ]
}

Nội dung bài viết:
${articleText}`;
}

export async function extractFloodEventsWithGemini(articleText: string): Promise<ExtractedFloodData> {
  const prompt = buildExtractionPrompt(articleText);
  const geminiModel = ENV.GEMINI_MODEL || 'gemini-3.8-flash';

  if (ENV.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
    const geminiText = await runProviderWithCircuitBreaker('Gemini', geminiModel, () =>
      callGeminiWithRetry(genAI, geminiModel, prompt, 2)
    );
    if (geminiText) {
      return withExtractionMetadata(parseGeminiExtractionResponse(geminiText), {
        extractionProvider: 'gemini',
        extractionModel: geminiModel,
        extractionQuality: 'primary',
        needsGeminiReanalysis: false,
      });
    }
  } else {
    console.warn('[Gemini AI] GEMINI_API_KEY is not configured. Skipping Gemini primary provider.');
  }

  const groqModel = ENV.GROQ_MODEL || 'openai/gpt-oss-120b';
  if (ENV.GROQ_API_KEY) {
    const groqText = await runProviderWithCircuitBreaker('Groq', groqModel, () =>
      callGroqWithRetry(groqModel, prompt, 2)
    );
    if (groqText) {
      return withExtractionMetadata(parseGeminiExtractionResponse(groqText), {
        extractionProvider: 'groq',
        extractionModel: groqModel,
        extractionQuality: 'fallback_ai',
        needsGeminiReanalysis: true,
      });
    }
  } else {
    console.warn('[Groq AI] GROQ_API_KEY is not configured. Skipping Groq fallback provider.');
  }

  console.warn('[AI Extraction] Gemini and Groq are unavailable. Falling back to rule-based NLP extraction.');
  return extractWithRuleBasedFallback(articleText);
}
