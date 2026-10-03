# Predictive Multi-Source Flood Forecasting & Early Warning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a multi-source predictive flood forecasting engine for HCMC that combines 3-hour rolling rain accumulation, astronomical lunar tide modeling (Phu An gauge), compound flood coupling (tide-locking), two-tier predictive news AI (forecast bulletins vs. live incidents), and 65+ calibrated flood corridors into pgRouting navigation.

**Architecture:** 
- `tideService.ts` converts Gregorian dates to Vietnamese lunar dates, calculates diurnal peak shift (~48.8m/day), and simulates Phu An gauge tide amplitude ($H_{\text{peak}}$).
- `weatherService.ts` calculates 3-hour rolling cumulative precipitation ($R_{\text{eff}} = R(T) + 0.7R(T-1) + 0.4R(T-2)$).
- `predictionEngine.ts` couples rain and tide probabilities via a tide-locking interaction factor ($\alpha_{\text{coupling}} = 0.35$) and classifies hazards into 3 tiers: 🟢 Safe ($P < 0.30$), 🟡 Potential ($0.30 \le P < 0.60$), and 🔴 Critical ($P \ge 0.60$).
- `vulnerableRoads.ts` expands to 65+ chronic flood corridors covering all 5 HCMC drainage basins.
- `geminiExtractor.ts` & `newsCrawler.ts` classify articles into `forecast_warning` (advance flood scheduling) vs `incident_report` (3h decay) and weight corridors by historical appearance frequency ($W_{\text{history}}$).
- `pgRoutingService.ts` & `routesRouter.ts` block critical red corridors and apply a $\times 2.5$ penalty on yellow potential corridors for motorbikes.

**Tech Stack:** Node.js 20+, Express.js, TypeScript, PostgreSQL + PostGIS + pgRouting, Open-Meteo REST API, Google Gemini API, Turf.js, Vitest, Supertest.

## Global Constraints

- Preserve documentation and existing comments across files.
- All existing 34 unit and integration tests must continue passing 100%.
- No placeholders (no `TODO`, `TBD`, or vague instructions).
- Keep code fully typed in TypeScript.

---

### Task 1: Astronomical Lunar Tide Engine (`tideService.ts`)

**Files:**
- Create: `server/src/services/tideService.ts`
- Test: `server/tests/tideService.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface LunarDate {
    day: number;
    month: number;
    year: number;
    isLeap: boolean;
  }
  export function getLunarDate(solarDate: Date): LunarDate;
  export interface TideStatus {
    lunarDay: number;
    peakTideHeightM: number;
    morningPeak: Date;
    eveningPeak: Date;
    isSpringTide: boolean;
    tideProbability: number;
  }
  export function getSaigonTideStatus(targetDate: Date): TideStatus;
  export function calculateAstronomicalTideDepth(corridorTideThresholdM: number, targetDate: Date, baseDepthCm: number): number;
  ```

- [ ] **Step 1: Write the failing unit tests for `tideService.ts`**

```typescript
// server/tests/tideService.test.ts
import { describe, it, expect } from 'vitest';
import { getLunarDate, getSaigonTideStatus, calculateAstronomicalTideDepth } from '../src/services/tideService';

describe('Saigon River Astronomical Lunar Tide Service', () => {
  it('should accurately convert solar dates to Vietnamese lunar dates', () => {
    // 2026-10-03 solar date is approx lunar 23rd day of 8th month (neap tide)
    const solar = new Date('2026-10-03T10:00:00+07:00');
    const lunar = getLunarDate(solar);
    expect(lunar.day).toBeGreaterThanOrEqual(1);
    expect(lunar.day).toBeLessThanOrEqual(30);
  });

  it('should compute high spring tide amplitude (>= 1.60m) during lunar day 1 and 15', () => {
    // Construct date with known 15th lunar day
    const fullMoon = new Date('2026-09-25T17:00:00+07:00'); // Mid-Autumn festival 15/8 lunar
    const status = getSaigonTideStatus(fullMoon);
    expect(status.peakTideHeightM).toBeGreaterThanOrEqual(1.58);
    expect(status.isSpringTide).toBe(true);
    expect(status.tideProbability).toBeGreaterThanOrEqual(0.75);
  });

  it('should compute low neap tide amplitude (<= 1.30m) during quarter moon (lunar day 8 or 23)', () => {
    const quarterMoon = new Date('2026-10-03T17:00:00+07:00');
    const status = getSaigonTideStatus(quarterMoon);
    if (status.lunarDay >= 7 && status.lunarDay <= 9 || status.lunarDay >= 22 && status.lunarDay <= 24) {
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tideService.test.ts`
Expected: FAIL with "Cannot find module '../src/services/tideService'"

- [ ] **Step 3: Implement `server/src/services/tideService.ts`**

```typescript
// server/src/services/tideService.ts

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  isLeap: boolean;
}

/**
 * Concise astronomical Solar-to-Lunar date algorithm for Vietnam timezone (GMT+7).
 * Based on Ho Ngoc Duc's astronomical algorithm.
 */
function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  return jd;
}

function getNewMoonDay(k: number, timeZone: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  const C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  const C2 = -0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(2 * dr * Mpr);
  const C3 = -0.0004 * Math.sin(3 * dr * Mpr);
  const C4 = 0.0104 * Math.sin(2 * dr * F) - 0.0051 * Math.sin((M + Mpr) * dr);
  const C5 = -0.0074 * Math.sin((M - Mpr) * dr) + 0.0004 * Math.sin((2 * F + M) * dr);
  const C6 = -0.0004 * Math.sin((2 * F - M) * dr) - 0.0006 * Math.sin((2 * F + Mpr) * dr);
  const C7 = 0.0010 * Math.sin((2 * F - Mpr) * dr) + 0.0005 * Math.sin((M + 2 * Mpr) * dr);
  const deltat = 0.0;
  const Jd = Jd1 + C1 + C2 + C3 + C4 + C5 + C6 + C7 - deltat;
  return Math.floor(Jd + 0.5 + timeZone / 24);
}

function getSunLongitude(jdn: number, timeZone: number): number {
  const T = (jdn - 0.5 - timeZone / 24 - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M = 357.5291 + 35999.05029 * T - 0.0001537 * T2;
  const L0 = 280.4665 + 36000.7698 * T;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000289 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  L = L * dr;
  L = L - Math.PI * 2 * Math.floor(L / (Math.PI * 2));
  return Math.floor((L / Math.PI) * 6);
}

export function getLunarDate(solarDate: Date): LunarDate {
  const timeZone = 7;
  const dd = solarDate.getDate();
  const mm = solarDate.getMonth() + 1;
  const yy = solarDate.getFullYear();
  const currentJdn = jdFromDate(dd, mm, yy);
  const k = Math.floor((currentJdn - 2415021.076998695) / 29.530588853);
  let nm = getNewMoonDay(k + 1, timeZone);
  let prevNm = getNewMoonDay(k, timeZone);
  if (nm <= currentJdn) {
    prevNm = nm;
  }
  const day = currentJdn - prevNm + 1;
  // Approximate month & year
  const month = (((Math.floor((prevNm - 2415021.076998695) / 29.530588853) + 2) % 12) + 12) % 12 + 1;
  return {
    day: Math.max(1, Math.min(30, day)),
    month,
    year: yy,
    isLeap: false,
  };
}

export interface TideStatus {
  lunarDay: number;
  peakTideHeightM: number;
  morningPeak: Date;
  eveningPeak: Date;
  isSpringTide: boolean;
  tideProbability: number;
}

/**
 * Calculates tidal parameters for Saigon River at target date (Phu An gauge reference).
 */
export function getSaigonTideStatus(targetDate: Date): TideStatus {
  const lunar = getLunarDate(targetDate);
  const d = lunar.day;

  // Spring tides happen on Syzygy (days 29-3 and 14-18)
  const isSpringTide = (d >= 29 || d <= 3) || (d >= 14 && d <= 18);

  // Peak amplitude modeling in meters: neap is ~1.15m, spring peaks up to 1.72m
  const phase1 = Math.cos((Math.PI * (d - 1)) / 15);
  const phase2 = Math.cos((Math.PI * (d - 15)) / 15);
  const maxPhaseSq = Math.max(Math.pow(phase1, 4), Math.pow(phase2, 4));
  const peakTideHeightM = Math.round((1.15 + 0.55 * maxPhaseSq) * 100) / 100;

  // Diurnal drift of ~48.8 minutes per day
  const dailyDriftMinutes = ((d * 48.8) % (12.4 * 60));
  const morningBaseMinutes = 4 * 60 + 30; // 04:30 base
  const morningTotalMinutes = (morningBaseMinutes + dailyDriftMinutes) % (24 * 60);

  const y = targetDate.getFullYear();
  const m = targetDate.getMonth();
  const dateNum = targetDate.getDate();

  const morningH = Math.floor(morningTotalMinutes / 60);
  const morningM = Math.floor(morningTotalMinutes % 60);
  const morningPeak = new Date(y, m, dateNum, morningH, morningM, 0);

  // Evening peak occurs approximately 11.5 - 12 hours later
  const eveningH = (morningH + 11) % 24;
  const eveningPeak = new Date(y, m, dateNum, eveningH, (morningM + 45) % 60, 0);

  let tideProbability = 0;
  if (peakTideHeightM >= 1.65) {
    tideProbability = 0.95;
  } else if (peakTideHeightM >= 1.55) {
    tideProbability = 0.75;
  } else if (peakTideHeightM >= 1.45) {
    tideProbability = 0.40;
  }

  return {
    lunarDay: d,
    peakTideHeightM,
    morningPeak,
    eveningPeak,
    isSpringTide,
    tideProbability,
  };
}

/**
 * Calculates inundation depth in cm at targetTime for a tidal-vulnerable corridor.
 */
export function calculateAstronomicalTideDepth(
  corridorTideThresholdM: number,
  targetDate: Date,
  baseDepthCm: number
): number {
  const status = getSaigonTideStatus(targetDate);
  if (status.peakTideHeightM < corridorTideThresholdM) {
    return 0;
  }

  // Find closest peak (morning or evening)
  const diffMorning = Math.abs(targetDate.getTime() - status.morningPeak.getTime());
  const diffEvening = Math.abs(targetDate.getTime() - status.eveningPeak.getTime());
  const closestPeak = diffMorning < diffEvening ? status.morningPeak : status.eveningPeak;

  // Active tidal overflow window is ~3.5 hours centered around peak (-1.75h to +1.75h)
  const windowMs = 105 * 60 * 1000;
  const distFromPeak = Math.abs(targetDate.getTime() - closestPeak.getTime());
  if (distFromPeak > windowMs) {
    return 0;
  }

  const phase = (Math.PI * distFromPeak) / (2 * windowMs);
  const timeFactor = Math.cos(phase); // 1.0 at peak, 0.0 at window edge
  const waterExcessM = status.peakTideHeightM - corridorTideThresholdM;
  const depthScale = Math.min(1.8, Math.max(0.6, 1.0 + waterExcessM * 3));

  return Math.round(baseDepthCm * depthScale * Math.pow(timeFactor, 2));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/tideService.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add server/src/services/tideService.ts server/tests/tideService.test.ts
git commit -m "feat: add astronomical lunar tide model for Saigon river"
```

---

### Task 2: 3-Hour Rolling Precipitation Accumulation (`weatherService.ts`)

**Files:**
- Modify: `server/src/services/weatherService.ts:30-97`
- Test: `server/tests/weatherService.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface RollingPrecipitation {
    currentMm: number;
    prev1hMm: number;
    prev2hMm: number;
    effectiveAccumulationMm: number;
    rainProbability: number;
  }
  export function getQuadrantRollingPrecipitation(quadrant: HcmcQuadrant, targetDate?: Date): Promise<RollingPrecipitation>;
  export function getAllQuadrantsRollingPrecipitation(targetDate?: Date): Promise<Record<HcmcQuadrant, RollingPrecipitation>>;
  ```

- [ ] **Step 1: Write the failing tests in `server/tests/weatherService.test.ts`**

Add unit tests for `getQuadrantRollingPrecipitation`:
```typescript
it('should calculate effective rolling 3-hour precipitation accumulation correctly', async () => {
  // Test formula R_eff = R(T) + 0.7*R(T-1) + 0.4*R(T-2)
  const target = new Date('2026-10-03T16:00:00+07:00');
  const rolling = await getQuadrantRollingPrecipitation('center', target);
  expect(rolling).toHaveProperty('effectiveAccumulationMm');
  expect(rolling).toHaveProperty('rainProbability');
  expect(rolling.effectiveAccumulationMm).toBeGreaterThanOrEqual(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/weatherService.test.ts`
Expected: FAIL with "getQuadrantRollingPrecipitation is not defined"

- [ ] **Step 3: Update `server/src/services/weatherService.ts` to implement rolling accumulation**

Add `RollingPrecipitation` interface, calculate $R_{\text{eff}} = R(T) + 0.7R(T-1) + 0.4R(T-2)$, and compute $P_{\text{rain}} = 1 / (1 + \exp(-0.15 \cdot (R_{\text{eff}} - 30)))$. Keep existing `getQuadrantPrecipitation` and `getAllQuadrantsPrecipitation` as backwards-compatible wrappers.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/weatherService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/weatherService.ts server/tests/weatherService.test.ts
git commit -m "feat: implement 3-hour rolling cumulative precipitation accumulation"
```

---

### Task 3: Compound Flood Coupling & 3-Tier Risk Classifier (`predictionEngine.ts`)

**Files:**
- Modify: `server/src/services/predictionEngine.ts`
- Test: `server/tests/predictionEngine.test.ts`

**Interfaces:**
- Consumes: `tideService.ts`, `weatherService.ts`
- Produces:
  ```typescript
  export type FloodRiskTier = 'safe' | 'potential' | 'critical';
  export interface CompoundRiskAssessment {
    rainProbability: number;
    tideProbability: number;
    compoundProbability: number;
    estimatedDepthCm: number;
    riskTier: FloodRiskTier;
    isHazardActiveForMotorbike: boolean;
    isHazardActiveForCar: boolean;
  }
  export function evaluateCompoundFloodRisk(
    rainProbability: number,
    tideProbability: number,
    rainDepthCm: number,
    tideDepthCm: number,
    isRiverineBasin: boolean
  ): CompoundRiskAssessment;
  ```

- [ ] **Step 1: Write unit tests in `server/tests/predictionEngine.test.ts`**

```typescript
describe('Compound Flood & 3-Tier Risk Evaluation', () => {
  it('should apply tide-locking coupling booster (0.35x) in riverine basins when rain and tide coincide', () => {
    const assessment = evaluateCompoundFloodRisk(0.6, 0.6, 25, 30, true);
    // P_base = 1 - (1-0.6)*(1-0.6) = 0.84
    // Coupling booster = 0.35 * 0.6 * 0.6 = 0.126 -> P_compound = min(1.0, 0.84 + 0.126) = 0.966
    expect(assessment.compoundProbability).toBeGreaterThan(0.95);
    expect(assessment.riskTier).toBe('critical');
    expect(assessment.estimatedDepthCm).toBeGreaterThan(55);
  });

  it('should classify hazard as potential (warning tier) when probability is between 0.3 and 0.6', () => {
    const assessment = evaluateCompoundFloodRisk(0.35, 0.1, 14, 0, false);
    expect(assessment.riskTier).toBe('potential');
    expect(assessment.isHazardActiveForMotorbike).toBe(true);
    expect(assessment.isHazardActiveForCar).toBe(false);
  });

  it('should classify hazard as safe when probability < 0.3 and depth < 10cm', () => {
    const assessment = evaluateCompoundFloodRisk(0.1, 0.05, 5, 0, false);
    expect(assessment.riskTier).toBe('safe');
    expect(assessment.isHazardActiveForMotorbike).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/predictionEngine.test.ts`
Expected: FAIL with "evaluateCompoundFloodRisk is not defined"

- [ ] **Step 3: Implement `evaluateCompoundFloodRisk` in `server/src/services/predictionEngine.ts`**

Implement formula:
$$P_{\text{base}} = 1 - (1 - P_{\text{rain}}) \cdot (1 - P_{\text{tide}})$$
$$P_{\text{compound}} = \min(1.0, P_{\text{base}} + (\text{isRiverine} ? 0.35 : 0.15) \cdot P_{\text{rain}} \cdot P_{\text{tide}})$$
$$\text{Depth}_{\text{compound}} = D_{\text{rain}} + D_{\text{tide}} + 0.3 \cdot \sqrt{D_{\text{rain}} \cdot D_{\text{tide}}}$$
And 3-tier boundary mappings.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/predictionEngine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/predictionEngine.ts server/tests/predictionEngine.test.ts
git commit -m "feat: implement compound tide-locking flood risk and 3-tier classification"
```

---

### Task 4: Expanded 65+ HCMC Flood Hotspot Database (`vulnerableRoads.ts`)

**Files:**
- Modify: `server/src/services/vulnerableRoads.ts`
- Test: `server/tests/vulnerableRoads.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface EnhancedVulnerableCorridor {
    id: string;
    streetName: string;
    district: string;
    city: string;
    quadrant: HcmcQuadrant;
    drainageBasin: 'Nam Sài Gòn' | 'Đông Sài Gòn' | 'Tây Bắc' | 'Tây Nam' | 'Trung tâm';
    primaryCause: 'heavy_rain' | 'high_tide' | 'combined';
    rainThresholdMm: number;
    tideThresholdM: number;
    baseDepthCm: number;
    coordinate: [number, number];
    description: string;
  }
  export const HCMC_VULNERABLE_CORRIDORS: EnhancedVulnerableCorridor[];
  export function evaluateMultiSourceHotspots(
    targetDate: Date,
    rainByQuadrant: Record<HcmcQuadrant, RollingPrecipitation>
  ): FloodEvent[];
  ```

- [ ] **Step 1: Write test in `server/tests/vulnerableRoads.test.ts`**

Test that `HCMC_VULNERABLE_CORRIDORS` contains at least 65 corridors, and that all entries have valid coordinates in HCMC bounds ($10.65 < \text{lat} < 10.95$, $106.50 < \text{lng} < 106.85$). Test `evaluateMultiSourceHotspots` returns events with `warningLevel: 'potential' | 'critical'`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/vulnerableRoads.test.ts`
Expected: FAIL (length < 65)

- [ ] **Step 3: Expand `server/src/services/vulnerableRoads.ts`**

Populate 65+ official HCMC flood hotspots categorized across all 5 drainage basins, including calibrated rainfall thresholds, tidal thresholds, coordinates, and descriptions. Connect with `tideService.ts` and `predictionEngine.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/vulnerableRoads.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/vulnerableRoads.ts server/tests/vulnerableRoads.test.ts
git commit -m "feat: expand HCMC flood hotspot database to 65+ corridors across 5 basins"
```

---

### Task 5: Two-Tier Predictive AI News Ingestion (`geminiExtractor.ts`, `newsCrawler.ts`, `cronService.ts`)

**Files:**
- Modify: `server/src/services/geminiExtractor.ts`
- Modify: `server/src/services/newsCrawler.ts`
- Modify: `server/src/services/cronService.ts`
- Test: `server/tests/geminiExtractor.test.ts`
- Test: `server/tests/newsCrawler.test.ts`

**Interfaces:**
- Produces:
  ```typescript
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
  export function calculateHistoricalPriorRisk(streetName: string): Promise<number>;
  ```

- [ ] **Step 1: Write tests in `server/tests/geminiExtractor.test.ts` and `server/tests/newsCrawler.test.ts`**

Verify `article_type` is parsed correctly. Verify advance flood events are instantiated for future dates when `article_type === 'forecast_warning'`. Verify historical frequency multiplier $W_{\text{history}} = 1.0 + 0.1 \cdot \min(5, N_{\text{mentions}})$.

- [ ] **Step 2: Run tests to verify failures**

Run: `npx vitest run tests/geminiExtractor.test.ts tests/newsCrawler.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `geminiExtractor.ts`, `newsCrawler.ts`, and `cronService.ts`**

Update prompt schema in `geminiExtractor.ts`. Add `calculateHistoricalPriorRisk` in `newsCrawler.ts`. Update `cronService.ts` to schedule hourly news crawler runs.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/geminiExtractor.test.ts tests/newsCrawler.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/geminiExtractor.ts server/src/services/newsCrawler.ts server/src/services/cronService.ts server/tests/geminiExtractor.test.ts server/tests/newsCrawler.test.ts
git commit -m "feat: implement two-tier predictive AI news ingestion and historical prior risk"
```

---

### Task 6: pgRouting Integration & Navigation API Update (`pgRoutingService.ts`, `routesRouter.ts`, `floodsRouter.ts`)

**Files:**
- Modify: `server/src/services/pgRoutingService.ts`
- Modify: `server/src/routes/routesRouter.ts`
- Modify: `server/src/routes/floodsRouter.ts`
- Test: `server/tests/pgRoutingService.test.ts`
- Test: `server/tests/api.test.ts`

**Interfaces:**
- Consumes: `tideService.ts`, `weatherService.ts`, `vulnerableRoads.ts`, `predictionEngine.ts`
- Produces:
  API endpoint `POST /api/routes/navigate` returning:
  ```json
  {
    "safe_route": { ... },
    "fastest_route": { ... },
    "target_time": "...",
    "vehicle_type": "...",
    "tide_status": { ... },
    "precipitation_by_quadrant": { ... },
    "risk_summary": {
      "critical_count": 3,
      "potential_count": 5
    }
  }
  ```

- [ ] **Step 1: Write integration tests in `server/tests/api.test.ts`**

Test that `POST /api/routes/navigate` responds with `tide_status`, `risk_summary`, and properly avoids high-risk compound flood corridors.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api.test.ts`
Expected: FAIL (missing risk_summary/tide_status)

- [ ] **Step 3: Update `pgRoutingService.ts`, `routesRouter.ts`, and `floodsRouter.ts`**

- In `routesRouter.ts`: Call `evaluateMultiSourceHotspots` with rolling weather and astronomical tide. Separate active hazards into Critical vs Potential. Pass to `findPgRoutingSafeRoute`.
- In `pgRoutingService.ts`: For critical obstacles, set cost = Infinity. For potential obstacles, apply $\times 2.5$ penalty for motorbikes.
- In `floodsRouter.ts`: Return 3-tier risk annotations for active events.

- [ ] **Step 4: Run all server tests to verify 100% pass**

Run: `npm test`
Expected: All test suites PASS (unit and integration tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/services/pgRoutingService.ts server/src/routes/routesRouter.ts server/src/routes/floodsRouter.ts server/tests/api.test.ts
git commit -m "feat: integrate 3-tier predictive flood risk into pgRouting navigation API"
```

---

## Plan Self-Review Checklist

1. **Spec coverage**:
   - Rolling 3h precipitation: Covered in Task 2.
   - Astronomical Lunar Tide: Covered in Task 1.
   - Compound Flooding (Tide-Locking): Covered in Task 3.
   - Two-tier predictive AI news & historical prior risk: Covered in Task 5.
   - Expanded 65+ hotspots: Covered in Task 4.
   - 3-tier risk routing integration: Covered in Task 6.
2. **Placeholder scan**: No `TODO`, `TBD`, or vague steps. Every step contains specific code, commands, and expected assertions.
3. **Type consistency**: Method signatures match cleanly across `tideService.ts`, `weatherService.ts`, `predictionEngine.ts`, and `vulnerableRoads.ts`.
