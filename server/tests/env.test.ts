import { describe, it, expect } from 'vitest';
import { ENV, VEHICLE_THRESHOLDS } from '../src/config/env';

describe('Environment and Configuration', () => {
  it('should load default configuration values correctly', () => {
    expect(ENV.PORT).toBeDefined();
    expect(VEHICLE_THRESHOLDS.motorbike.safe).toBe(15);
    expect(VEHICLE_THRESHOLDS.motorbike.avoid).toBe(20);
    expect(VEHICLE_THRESHOLDS.car.safe).toBe(25);
    expect(VEHICLE_THRESHOLDS.car.avoid).toBe(35);
  });
});
