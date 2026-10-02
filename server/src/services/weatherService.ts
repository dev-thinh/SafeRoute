import axios from 'axios';

export type HcmcQuadrant = 'center' | 'south' | 'east' | 'northwest';

export interface QuadrantLocation {
  name: string;
  lat: number;
  lng: number;
}

export const HCMC_QUADRANTS: Record<HcmcQuadrant, QuadrantLocation> = {
  center: { name: 'Trung tâm', lat: 10.7769, lng: 106.7009 },
  south: { name: 'Nam Sài Gòn', lat: 10.7333, lng: 106.7167 },
  east: { name: 'Đông Sài Gòn (Thủ Đức)', lat: 10.8494, lng: 106.7725 },
  northwest: { name: 'Tây Bắc (Gò Vấp, Q12)', lat: 10.8400, lng: 106.6300 },
};

interface CacheEntry {
  timestamp: number;
  precipitationMm: number;
  hourlyMap: Record<string, number>;
}

// 15-minute in-memory cache for meteorological calls
const weatherCache = new Map<HcmcQuadrant, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Fetches precipitation (mm/h) for a specific HCMC quadrant from Open-Meteo.
 * Falls back gracefully to 0 mm if network or API error occurs.
 */
export async function getQuadrantPrecipitation(
  quadrant: HcmcQuadrant,
  targetDate: Date = new Date()
): Promise<number> {
  const now = Date.now();
  const cached = weatherCache.get(quadrant);

  // If cache is fresh, check hourly map or return current
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    const hourKey = targetDate.toISOString().slice(0, 13) + ':00';
    if (cached.hourlyMap[hourKey] !== undefined) {
      return cached.hourlyMap[hourKey];
    }
    return cached.precipitationMm;
  }

  const { lat, lng } = HCMC_QUADRANTS[quadrant];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation,rain&hourly=precipitation,rain&timezone=Asia%2FBangkok`;

  try {
    const res = await axios.get(url, { timeout: 4000 });
    const currentPrecip = parseFloat(res.data?.current?.precipitation || res.data?.current?.rain || '0');

    const hourlyMap: Record<string, number> = {};
    const times: string[] = res.data?.hourly?.time || [];
    const precips: number[] = res.data?.hourly?.precipitation || res.data?.hourly?.rain || [];

    for (let i = 0; i < times.length; i++) {
      hourlyMap[times[i]] = parseFloat(String(precips[i] || 0));
    }

    weatherCache.set(quadrant, {
      timestamp: now,
      precipitationMm: currentPrecip,
      hourlyMap,
    });

    const hourKey = targetDate.toISOString().slice(0, 13) + ':00';
    if (hourlyMap[hourKey] !== undefined) {
      return hourlyMap[hourKey];
    }
    return currentPrecip;
  } catch (err: any) {
    console.warn(`[Weather] Failed to fetch precipitation for ${quadrant}:`, err.message);
    if (cached) return cached.precipitationMm;
    return 0;
  }
}

/**
 * Retrieves rainfall precipitation for all 4 quadrants across HCMC simultaneously.
 */
export async function getAllQuadrantsPrecipitation(
  targetDate: Date = new Date()
): Promise<Record<HcmcQuadrant, number>> {
  const quadrants: HcmcQuadrant[] = ['center', 'south', 'east', 'northwest'];
  const results = await Promise.all(
    quadrants.map(async (q) => {
      const mm = await getQuadrantPrecipitation(q, targetDate);
      return [q, mm] as const;
    })
  );

  return Object.fromEntries(results) as Record<HcmcQuadrant, number>;
}

import { HCMC_VULNERABLE_CORRIDORS } from './vulnerableRoads';

export interface QuadrantWeatherStatus {
  id: HcmcQuadrant;
  name: string;
  lat: number;
  lng: number;
  precipitationMm: number;
  alertLevel: 'safe' | 'warning' | 'danger';
  alertText: string;
}

export interface HourlyForecastItem {
  time: string;
  precipitationMm: number;
}

export interface WeatherDashboardData {
  quadrants: QuadrantWeatherStatus[];
  hourlyTimeline: HourlyForecastItem[];
  corridorsAtRisk: Array<{
    id: string;
    streetName: string;
    district: string;
    rainThresholdMm: number;
    currentRainMm: number;
    estimatedDepthCm: number;
    coordinate: [number, number];
    description: string;
    isCurrentlyFlooded: boolean;
  }>;
  fetchedAt: string;
}

/**
 * Aggregates complete weather forecast and flood vulnerability analytics for HCMC.
 */
export async function getWeatherDashboardData(targetDate: Date = new Date()): Promise<WeatherDashboardData> {
  const rainByQuadrant = await getAllQuadrantsPrecipitation(targetDate);

  const quadrants: QuadrantWeatherStatus[] = (['center', 'south', 'east', 'northwest'] as HcmcQuadrant[]).map((q) => {
    const loc = HCMC_QUADRANTS[q];
    const mm = rainByQuadrant[q] || 0;
    let alertLevel: 'safe' | 'warning' | 'danger' = 'safe';
    let alertText = 'Thời tiết ổn định, không ngập';

    if (mm >= 35) {
      alertLevel = 'danger';
      alertText = 'Mưa rất to, nguy cơ ngập sâu';
    } else if (mm >= 15) {
      alertLevel = 'warning';
      alertText = 'Mưa vừa, nguy cơ ngập cục bộ';
    }

    return {
      id: q,
      name: loc.name,
      lat: loc.lat,
      lng: loc.lng,
      precipitationMm: mm,
      alertLevel,
      alertText,
    };
  });

  // Extract next 12 hours from center quadrant cache
  const cachedCenter = weatherCache.get('center');
  const hourlyTimeline: HourlyForecastItem[] = [];
  if (cachedCenter?.hourlyMap) {
    const sortedKeys = Object.keys(cachedCenter.hourlyMap).sort();
    const nowKey = targetDate.toISOString().slice(0, 13) + ':00';
    const futureKeys = sortedKeys.filter((k) => k >= nowKey).slice(0, 12);
    for (const k of futureKeys) {
      hourlyTimeline.push({
        time: k,
        precipitationMm: cachedCenter.hourlyMap[k] || 0,
      });
    }
  }

  // Cross-reference with all calibrated vulnerable corridors
  const corridorsAtRisk = HCMC_VULNERABLE_CORRIDORS.map((corridor) => {
    let rainMm = rainByQuadrant[corridor.quadrant] || 0;
    if (corridor.district === 'Bình Thạnh') {
      rainMm = Math.max(rainByQuadrant.center || 0, rainByQuadrant.east || 0);
    }
    const isFlooded = rainMm >= corridor.rainThresholdMm;
    const ratio = rainMm > 0 ? rainMm / corridor.rainThresholdMm : 0;
    const estimatedDepth = isFlooded ? Math.min(75, Math.round(corridor.baseDepthCm * Math.sqrt(ratio))) : 0;

    return {
      id: corridor.id,
      streetName: corridor.streetName,
      district: corridor.district,
      rainThresholdMm: corridor.rainThresholdMm,
      currentRainMm: rainMm,
      estimatedDepthCm: estimatedDepth,
      coordinate: corridor.coordinate,
      description: corridor.description,
      isCurrentlyFlooded: isFlooded,
    };
  });

  return {
    quadrants,
    hourlyTimeline,
    corridorsAtRisk,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Resets the cache (useful for testing).
 */
export function clearWeatherCache(): void {
  weatherCache.clear();
}

