import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import {
  getQuadrantPrecipitation,
  getAllQuadrantsPrecipitation,
  clearWeatherCache,
  HCMC_QUADRANTS,
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

  it('should gracefully return 0 mm when Open-Meteo is unreachable', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network timeout'));

    const precip = await getQuadrantPrecipitation('south');
    expect(precip).toBe(0);
  });
});
