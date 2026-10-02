import { describe, it, expect } from 'vitest';
import {
  HCMC_VULNERABLE_CORRIDORS,
  getRainInducedFloodEvents,
} from '../src/services/vulnerableRoads';

describe('Vulnerable Roads Registry', () => {
  it('should maintain calibrated corridors across all 4 HCMC quadrants', () => {
    expect(HCMC_VULNERABLE_CORRIDORS.length).toBeGreaterThanOrEqual(14);
    const quadrants = new Set(HCMC_VULNERABLE_CORRIDORS.map((c) => c.quadrant));
    expect(quadrants.has('northwest')).toBe(true);
    expect(quadrants.has('east')).toBe(true);
    expect(quadrants.has('south')).toBe(true);
    expect(quadrants.has('center')).toBe(true);
  });

  it('should produce zero flood events when rain is below all thresholds', () => {
    const dryRain = { center: 5, south: 10, east: 8, northwest: 12 };
    const events = getRainInducedFloodEvents(new Date(), dryRain);
    expect(events.length).toBe(0);
  });

  it('should trigger flood events specifically in northwest when rain exceeds 30mm/h', () => {
    const stormNorthwest = { center: 10, south: 10, east: 10, northwest: 45 };
    const events = getRainInducedFloodEvents(new Date(), stormNorthwest);

    // Should trigger Phan Huy Ích (30), Lê Đức Thọ (35), Nguyễn Văn Khối (25), Nguyễn Văn Quá (30), Song Hành (35)
    expect(events.length).toBeGreaterThanOrEqual(5);

    const phanHuyIch = events.find((e) => e.streetName === 'Phan Huy Ích');
    expect(phanHuyIch).toBeDefined();
    expect(phanHuyIch?.cause).toBe('heavy_rain');
    expect(phanHuyIch?.sourceType).toBe('weather_radar');
    expect(phanHuyIch?.estimatedDepthCm).toBeGreaterThanOrEqual(45);
    expect(phanHuyIch?.confidenceScore).toBeGreaterThanOrEqual(0.85);

    // East corridors (e.g. Võ Văn Ngân) should NOT trigger
    const voVanNgan = events.find((e) => e.streetName === 'Võ Văn Ngân');
    expect(voVanNgan).toBeUndefined();
  });

  it('should dynamically scale flood depth when rain intensity increases', () => {
    const moderate = getRainInducedFloodEvents(new Date(), {
      center: 0,
      south: 0,
      east: 35,
      northwest: 0,
    });
    const intense = getRainInducedFloodEvents(new Date(), {
      center: 0,
      south: 0,
      east: 70,
      northwest: 0,
    });

    const voVanNganMod = moderate.find((e) => e.streetName === 'Võ Văn Ngân');
    const voVanNganInt = intense.find((e) => e.streetName === 'Võ Văn Ngân');

    expect(voVanNganMod).toBeDefined();
    expect(voVanNganInt).toBeDefined();
    expect(voVanNganInt!.estimatedDepthCm).toBeGreaterThan(voVanNganMod!.estimatedDepthCm);
  });
});
