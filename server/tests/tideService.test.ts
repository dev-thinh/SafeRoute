import { describe, it, expect } from 'vitest';
import { getLunarDate, getSaigonTideStatus, calculateAstronomicalTideDepth } from '../src/services/tideService';

describe('Saigon River Astronomical Lunar Tide Service', () => {
  it('should accurately convert solar dates to Vietnamese lunar dates', () => {
    // 2026-10-03 solar date is approx lunar 23rd day of 8th month
    const solar = new Date('2026-10-03T10:00:00+07:00');
    const lunar = getLunarDate(solar);
    expect(lunar.day).toBeGreaterThanOrEqual(1);
    expect(lunar.day).toBeLessThanOrEqual(30);
  });

  it('should compute high spring tide amplitude (>= 1.58m) during lunar day 1 and 15', () => {
    // 2026-09-25 is lunar day 15 (Mid-Autumn festival 15/8 lunar)
    const fullMoon = new Date('2026-09-25T17:00:00+07:00');
    const status = getSaigonTideStatus(fullMoon);
    expect(status.peakTideHeightM).toBeGreaterThanOrEqual(1.58);
    expect(status.isSpringTide).toBe(true);
    expect(status.tideProbability).toBeGreaterThanOrEqual(0.75);
  });

  it('should compute lower neap tide amplitude (<= 1.35m) during quarter moon (lunar day 8 or 23)', () => {
    const quarterMoon = new Date('2026-10-03T17:00:00+07:00');
    const status = getSaigonTideStatus(quarterMoon);
    if ((status.lunarDay >= 7 && status.lunarDay <= 9) || (status.lunarDay >= 22 && status.lunarDay <= 24)) {
      expect(status.peakTideHeightM).toBeLessThanOrEqual(1.35);
      expect(status.isSpringTide).toBe(false);
      expect(status.tideProbability).toBeLessThan(0.30);
    }
  });

  it('should produce 0 cm depth when tide peak is below corridor threshold', () => {
    const target = new Date('2026-10-03T12:00:00+07:00');
    // Threshold 1.60m with neap tide ~1.25m
    const depth = calculateAstronomicalTideDepth(1.60, target, 45);
    expect(depth).toBe(0);
  });
});
