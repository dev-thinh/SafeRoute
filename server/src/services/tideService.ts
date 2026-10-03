export interface LunarDate {
  day: number;
  month: number;
  year: number;
  isLeap: boolean;
}

/**
 * Astronomical Solar-to-Lunar date algorithm for Vietnam timezone (GMT+7).
 * Adapted from Ho Ngoc Duc's astronomical algorithm for accurate Vietnamese lunar dates.
 */
function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  return dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
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
 * Calculates tidal parameters for Saigon River at target date (Phu An / Nha Be gauge reference).
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
