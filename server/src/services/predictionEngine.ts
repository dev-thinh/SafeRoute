import { FloodEvent, UserReport, VehicleType } from '../types';
import { VEHICLE_THRESHOLDS } from '../config/env';

/**
 * Calculates tidal flood depth (cm) at targetTime using Half-Sine Harmonic Model.
 * Depth(T) = D_peak * sin^2(pi * (T - t_start) / (t_end - t_start))
 */
export function calculateTidalDepth(event: FloodEvent, targetTime: Date): number {
  const t = targetTime.getTime();
  const tStart = event.startTime.getTime();
  const tEnd = event.endTime.getTime();

  if (t < tStart || t > tEnd) {
    return 0;
  }

  const duration = tEnd - tStart;
  if (duration <= 0) return event.estimatedDepthCm;

  const phase = (Math.PI * (t - tStart)) / duration;
  const sinVal = Math.sin(phase);
  return event.estimatedDepthCm * (sinVal * sinVal);
}

/**
 * Calculates rain flood depth (cm) at targetTime using Synthetic Triangular Hydrograph.
 */
export function calculateRainDepth(event: FloodEvent, targetTime: Date): number {
  const t = targetTime.getTime();
  const tStart = event.startTime.getTime();
  const tPeak = event.peakTime.getTime();
  const tEnd = event.endTime.getTime();

  if (t < tStart || t > tEnd) {
    return 0;
  }

  if (t <= tPeak) {
    const risingDuration = tPeak - tStart;
    if (risingDuration <= 0) return event.estimatedDepthCm;
    return event.estimatedDepthCm * ((t - tStart) / risingDuration);
  } else {
    const recedingDuration = tEnd - tPeak;
    if (recedingDuration <= 0) return 0;
    return event.estimatedDepthCm * ((tEnd - t) / recedingDuration);
  }
}

/**
 * Calculates spatio-temporal confidence score [0, 1] for crowdsourced user reports.
 * Confidence(T) = exp(-(T - T_report) / tau) * sigmoid(w_up * upvotes - w_down * downvotes)
 */
export function calculateReportConfidence(report: UserReport, targetTime: Date): number {
  const diffMs = targetTime.getTime() - report.reportedAt.getTime();
  if (diffMs < 0) return 0;

  const tauMs = 60 * 60 * 1000; // 60 minutes characteristic half-life
  const timeDecay = Math.exp(-diffMs / tauMs);

  const consensusScore = 0.5 * report.upvotes - 1.2 * report.downvotes;
  const consensusWeight = 1 / (1 + Math.exp(-consensusScore));

  return Math.min(1, Math.max(0, timeDecay * consensusWeight * 1.5));
}

/**
 * Determines whether a flood point represents a critical obstacle for a given vehicle type.
 */
export function isHazardActive(
  depthCm: number,
  confidence: number,
  vehicleType: VehicleType
): boolean {
  if (confidence < 0.4) {
    return false;
  }
  const threshold = VEHICLE_THRESHOLDS[vehicleType].avoid;
  return depthCm >= threshold;
}

/**
 * Calculates flood depth for any FloodEvent, respecting its source type and temporal model.
 */
export function calculateEventDepth(event: FloodEvent, targetTime: Date): number {
  if (event.sourceType === 'news_crawler' || event.sourceType === 'admin_manual') {
    const t = targetTime.getTime();
    const tStart = event.startTime.getTime();
    const tEnd = event.endTime.getTime();
    if (t >= tStart && t <= tEnd) {
      return event.estimatedDepthCm;
    }
    const sameDay =
      targetTime.getFullYear() === event.startTime.getFullYear() &&
      targetTime.getMonth() === event.startTime.getMonth() &&
      targetTime.getDate() === event.startTime.getDate();
    if (sameDay) {
      return event.estimatedDepthCm;
    }
    return 0;
  }

  if (event.cause === 'high_tide') {
    return calculateTidalDepth(event, targetTime);
  }
  return calculateRainDepth(event, targetTime);
}

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

/**
 * Couples rain and astronomical tide probabilities with tide-locking effect in riverine basins.
 * Evaluates 3-tier risk:
 * - 🟢 'safe': P < 0.30 or depth < 10cm
 * - 🟡 'potential': 0.30 <= P < 0.60 or 10cm <= depth <= 20cm
 * - 🔴 'critical': P >= 0.60 or depth > 20cm (motorbike) / > 35cm (car)
 */
export function evaluateCompoundFloodRisk(
  rainProbability: number,
  tideProbability: number,
  rainDepthCm: number,
  tideDepthCm: number,
  isRiverineBasin: boolean = false
): CompoundRiskAssessment {
  // Independent joint probability: P_base = 1 - (1 - P_r) * (1 - P_t)
  const pBase = 1 - (1 - Math.max(0, Math.min(1, rainProbability))) * (1 - Math.max(0, Math.min(1, tideProbability)));
  
  // Coupling booster when rain and tide coincide: tide-locking traps gravity outfall water
  const couplingFactor = isRiverineBasin ? 0.35 : 0.15;
  const booster = couplingFactor * rainProbability * tideProbability;
  const compoundProbability = Math.round(Math.min(1.0, pBase + booster) * 100) / 100;

  // Compound depth formulation with synergistic backwater volume
  const interaction = (rainDepthCm > 0 && tideDepthCm > 0) ? 0.30 * Math.sqrt(rainDepthCm * tideDepthCm) : 0;
  const estimatedDepthCm = Math.round(rainDepthCm + tideDepthCm + interaction);

  let riskTier: FloodRiskTier = 'safe';
  if (compoundProbability >= 0.60 || estimatedDepthCm > 20) {
    riskTier = 'critical';
  } else if (compoundProbability >= 0.30 || estimatedDepthCm >= 10) {
    riskTier = 'potential';
  }

  const isHazardActiveForMotorbike = estimatedDepthCm >= VEHICLE_THRESHOLDS.motorbike.avoid || riskTier === 'potential' || riskTier === 'critical';
  const isHazardActiveForCar = estimatedDepthCm >= VEHICLE_THRESHOLDS.car.avoid || (riskTier === 'critical' && estimatedDepthCm >= 35);

  return {
    rainProbability,
    tideProbability,
    compoundProbability,
    estimatedDepthCm,
    riskTier,
    isHazardActiveForMotorbike,
    isHazardActiveForCar,
  };
}

