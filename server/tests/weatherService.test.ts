import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import {
  getQuadrantPrecipitation,
  getAllQuadrantsPrecipitation,
  getQuadrantRollingPrecipitation,
  getAllQuadrantsRollingPrecipitation,
  getWeatherDashboardData,
  getBangkokHourKey,
  clearWeatherCache,
  HCMC_QUADRANTS,
  scaleGridPrecipitationToUrbanLocal,
} from '../src/services/weatherService';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('Weather Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearWeatherCache();
  });

  it('should parse Open-Meteo current precipitation correctly', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        current: { precipitation: 32.5 },
        hourly: {
          time: ['2026-10-02T10:00'],
          precipitation: [32.5],
        },
      },
    });

    const precip = await getQuadrantPrecipitation('northwest', new Date('2026-10-02T10:00:00Z'));
    expect(precip).toBe(32.5);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('should utilize in-memory cache for subsequent calls within TTL', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        current: { precipitation: 45.0 },
        hourly: {
          time: [],
          precipitation: [],
        },
      },
    });

    const first = await getQuadrantPrecipitation('center');
    const second = await getQuadrantPrecipitation('center');

    expect(first).toBe(45.0);
    expect(second).toBe(45.0);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Cached, no 2nd HTTP request
  });

  it('should fetch precipitation for all 4 HCMC quadrants concurrently', async () => {
    mockedAxios.get.mockImplementation(async (url: any) => {
      if (url.includes(`longitude=${HCMC_QUADRANTS.northwest.lng}`)) {
        return { data: { current: { precipitation: 55.0 } } };
      }
      return { data: { current: { precipitation: 10.0 } } };
    });

    const all = await getAllQuadrantsPrecipitation();
    expect(all.northwest).toBe(55.0);
    expect(all.center).toBe(10.0);
    expect(all.south).toBe(10.0);
    expect(all.east).toBe(10.0);
  });

  it('should calculate effective rolling 3-hour precipitation accumulation correctly', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        current: { precipitation: 30.0 },
        hourly: {
          time: [
            '2026-10-02T14:00',
            '2026-10-02T15:00',
            '2026-10-02T16:00',
          ],
          precipitation: [20.0, 25.0, 30.0],
        },
      },
    });

    const target = new Date('2026-10-02T16:00:00Z');
    // R_eff = 30 + 0.7*25 + 0.4*20 = 30 + 17.5 + 8 = 55.5
    const rolling = await getQuadrantRollingPrecipitation('center', target);
    expect(rolling.currentMm).toBe(30.0);
    expect(rolling.prev1hMm).toBe(25.0);
    expect(rolling.prev2hMm).toBe(20.0);
    expect(rolling.effectiveAccumulationMm).toBe(55.5);
    expect(rolling.rainProbability).toBeGreaterThan(0.9);
  });

  it('should generate 12h forecast timeline strictly starting from current moment, not arbitrary target_time', async () => {
    mockedAxios.get.mockImplementation(async () => ({
      data: {
        current: { precipitation: 5.0 },
        hourly: {
          time: [],
          precipitation: [],
        },
      },
    }));

    // Pass a future target date (e.g. 5 hours later)
    const futureTarget = new Date(Date.now() + 5 * 3600 * 1000);
    const dashboard = await getWeatherDashboardData(futureTarget);

    expect(dashboard.hourlyTimeline).toHaveLength(12);
    const expectedCurrentKey = getBangkokHourKey(new Date());
    expect(dashboard.hourlyTimeline[0].time).toBe(expectedCurrentKey);
  });

  it('should scale global NWP precipitation to tropical urban downpour intensity', () => {
    expect(scaleGridPrecipitationToUrbanLocal(0)).toBe(0);
    expect(scaleGridPrecipitationToUrbanLocal(0.5)).toBe(7.0);
    expect(scaleGridPrecipitationToUrbanLocal(1.0)).toBe(14.0);
    expect(scaleGridPrecipitationToUrbanLocal(1.5)).toBe(21.0);
    expect(scaleGridPrecipitationToUrbanLocal(2.0)).toBe(28.0);
    // Directly measured station radar data (>= 15mm) is unscaled
    expect(scaleGridPrecipitationToUrbanLocal(25.0)).toBe(25.0);
    expect(scaleGridPrecipitationToUrbanLocal(55.5)).toBe(55.5);
  });
});

