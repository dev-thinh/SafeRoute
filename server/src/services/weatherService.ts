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

export interface RollingPrecipitation {
  currentMm: number;
  prev1hMm: number;
  prev2hMm: number;
  effectiveAccumulationMm: number;
  rainProbability: number;
}

/**
 * Calculates 3-hour rolling effective precipitation accumulation R_eff = R(T) + 0.7*R(T-1) + 0.4*R(T-2).
 * Also computes rain-induced flood probability P_rain.
 */
export async function getQuadrantRollingPrecipitation(
  quadrant: HcmcQuadrant,
  targetDate: Date = new Date()
): Promise<RollingPrecipitation> {
  const now = Date.now();
  let cached = weatherCache.get(quadrant);

  // If cache is missing or stale, fetch fresh data
  if (!cached || now - cached.timestamp >= CACHE_TTL_MS) {
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

      cached = {
        timestamp: now,
        precipitationMm: currentPrecip,
        hourlyMap,
      };
      weatherCache.set(quadrant, cached);
    } catch (err: any) {
      console.warn(`[Weather] Failed to fetch precipitation for ${quadrant}:`, err.message);
      if (!cached) {
        return {
          currentMm: 0,
          prev1hMm: 0,
          prev2hMm: 0,
          effectiveAccumulationMm: 0,
          rainProbability: 0,
        };
      }
    }
  }

  const currentHourKey = targetDate.toISOString().slice(0, 13) + ':00';
  const prev1hDate = new Date(targetDate.getTime() - 60 * 60 * 1000);
  const prev1hKey = prev1hDate.toISOString().slice(0, 13) + ':00';
  const prev2hDate = new Date(targetDate.getTime() - 120 * 60 * 1000);
  const prev2hKey = prev2hDate.toISOString().slice(0, 13) + ':00';

  const hourly = cached.hourlyMap || {};
  const currentMm = hourly[currentHourKey] !== undefined ? hourly[currentHourKey] : cached.precipitationMm;
  const prev1hMm = hourly[prev1hKey] !== undefined ? hourly[prev1hKey] : currentMm * 0.7;
  const prev2hMm = hourly[prev2hKey] !== undefined ? hourly[prev2hKey] : prev1hMm * 0.5;

  const effectiveAccumulationMm = Math.round((currentMm + 0.7 * prev1hMm + 0.4 * prev2hMm) * 10) / 10;

  // Logistic activation for rain probability with threshold 30mm design capacity
  const k = 0.15;
  const threshold = 30.0;
  const rainProbability = Math.round((1 / (1 + Math.exp(-k * (effectiveAccumulationMm - threshold)))) * 100) / 100;

  return {
    currentMm,
    prev1hMm,
    prev2hMm,
    effectiveAccumulationMm,
    rainProbability,
  };
}

/**
 * Retrieves rolling precipitation for all 4 quadrants across HCMC simultaneously.
 */
export async function getAllQuadrantsRollingPrecipitation(
  targetDate: Date = new Date()
): Promise<Record<HcmcQuadrant, RollingPrecipitation>> {
  const quadrants: HcmcQuadrant[] = ['center', 'south', 'east', 'northwest'];
  const results = await Promise.all(
    quadrants.map(async (q) => {
      const rolling = await getQuadrantRollingPrecipitation(q, targetDate);
      return [q, rolling] as const;
    })
  );

  return Object.fromEntries(results) as Record<HcmcQuadrant, RollingPrecipitation>;
}

/**
 * Fetches precipitation (mm/h) for a specific HCMC quadrant from Open-Meteo.
 * Falls back gracefully to 0 mm if network or API error occurs.
 */
export async function getQuadrantPrecipitation(
  quadrant: HcmcQuadrant,
  targetDate: Date = new Date()
): Promise<number> {
  const rolling = await getQuadrantRollingPrecipitation(quadrant, targetDate);
  return rolling.currentMm;
}

/**
 * Retrieves rainfall precipitation for all 4 quadrants across HCMC simultaneously.
 */
export async function getAllQuadrantsPrecipitation(
  targetDate: Date = new Date()
): Promise<Record<HcmcQuadrant, number>> {
  const allRolling = await getAllQuadrantsRollingPrecipitation(targetDate);
  return {
    center: allRolling.center.currentMm,
    south: allRolling.south.currentMm,
    east: allRolling.east.currentMm,
    northwest: allRolling.northwest.currentMm,
  };
}

import { HCMC_VULNERABLE_CORRIDORS } from './vulnerableRoads';
import { getSaigonTideStatus, calculateAstronomicalTideDepth } from './tideService';
import { evaluateCompoundFloodRisk, FloodRiskTier } from './predictionEngine';

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

export interface CorridorRiskStatus {
  id: string;
  streetName: string;
  district: string;
  rainThresholdMm: number;
  currentRainMm: number;
  estimatedDepthCm: number;
  coordinate: [number, number];
  description: string;
  isCurrentlyFlooded: boolean;
  riskTier?: FloodRiskTier;
  compoundProbability?: number;
}

export interface WeatherDashboardData {
  quadrants: QuadrantWeatherStatus[];
  hourlyTimeline: HourlyForecastItem[];
  corridorsAtRisk: CorridorRiskStatus[];
  tideStatus?: TideStatus;
  fetchedAt: string;
}

/**
 * Aggregates complete weather forecast and flood vulnerability analytics for HCMC.
 */
export async function getWeatherDashboardData(targetDate: Date = new Date()): Promise<WeatherDashboardData> {
  const allRolling = await getAllQuadrantsRollingPrecipitation(targetDate);
  const rainByQuadrant: Record<HcmcQuadrant, number> = {
    center: allRolling.center.currentMm,
    south: allRolling.south.currentMm,
    east: allRolling.east.currentMm,
    northwest: allRolling.northwest.currentMm,
  };
  const tideStatus = getSaigonTideStatus(targetDate);

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

  // Cross-reference with all calibrated vulnerable corridors using compound flood model
  const corridorsAtRisk: CorridorRiskStatus[] = HCMC_VULNERABLE_CORRIDORS.map((corridor) => {
    let quadData = allRolling[corridor.quadrant];
    if (corridor.district === 'Bình Thạnh') {
      const c = allRolling.center?.effectiveAccumulationMm || 0;
      const e = allRolling.east?.effectiveAccumulationMm || 0;
      quadData = c >= e ? allRolling.center : allRolling.east;
    }

    const rainAccumMm = quadData?.effectiveAccumulationMm || 0;
    const rainProb = quadData?.rainProbability || 0;

    let rainDepthCm = 0;
    if (rainAccumMm >= corridor.rainThresholdMm * 0.7) {
      const ratio = rainAccumMm / corridor.rainThresholdMm;
      rainDepthCm = Math.round(corridor.baseDepthCm * Math.sqrt(Math.max(0.2, ratio)));
    }

    const tideDepthCm = calculateAstronomicalTideDepth(
      corridor.tideThresholdM,
      targetDate,
      corridor.baseDepthCm
    );

    const isRiverine =
      corridor.drainageBasin === 'Nam Sài Gòn' ||
      corridor.district === 'Bình Thạnh' ||
      corridor.drainageBasin === 'Đông Sài Gòn';

    const assessment = evaluateCompoundFloodRisk(
      rainProb,
      tideStatus.tideProbability,
      rainDepthCm,
      tideDepthCm,
      isRiverine
    );

    const isFlooded = assessment.riskTier !== 'safe' && assessment.estimatedDepthCm >= 10;

    return {
      id: corridor.id,
      streetName: corridor.streetName,
      district: corridor.district,
      rainThresholdMm: corridor.rainThresholdMm,
      currentRainMm: quadData?.currentMm || 0,
      estimatedDepthCm: assessment.estimatedDepthCm,
      coordinate: corridor.coordinate,
      description: corridor.description,
      isCurrentlyFlooded: isFlooded,
      riskTier: assessment.riskTier,
      compoundProbability: assessment.compoundProbability,
    };
  });

  return {
    quadrants,
    hourlyTimeline,
    corridorsAtRisk,
    tideStatus,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Resets the cache (useful for testing).
 */
export function clearWeatherCache(): void {
  weatherCache.clear();
}

