import { UserReport } from '../types';
import { getAllQuadrantsRollingPrecipitation } from './weatherService';
import { getSaigonTideStatus } from './tideService';
import { HCMC_VULNERABLE_CORRIDORS } from './vulnerableRoads';

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface ModerationEvaluationResult {
  confidenceScore: number;
  aiReasoning: string;
  pillarScores: {
    weatherPillar: number;     // 0 - 1
    clusteringPillar: number;  // 0 - 1
    semanticPillar: number;    // 0 - 1
    topographicPillar: number; // 0 - 1
  };
  canAutoApprove: boolean;
}

export const SPAM_KEYWORDS = [
  'troll', 'haha', 'nóc nhà', 'lầu 3', 'lầu 4', 'lầu 5', 'chết hết', 'tàu ngầm',
  'bơi xuồng trong nhà', 'ngập 10m', 'ngập 5m', 'ngập 3m', 'ngập 2m', 'đĩ', 'đụ', 'đéo', 'vcl', 'clgt'
];

export const REALISTIC_KEYWORDS = [
  'chết máy', 'ngập pô', 'nửa bánh', 'bánh xe', 'mắt cá', 'đầu gối', 'dắt bộ',
  'mưa lớn', 'triều', 'nước dâng', 'nước ngập', 'trước cổng', 'chợ', 'ngã tư',
  'ngã ba', 'cầu', 'hẻm', 'đường', 'kẹt xe', 'tràn bờ', 'xe máy', 'ô tô'
];

/**
 * 4-Pillar AI Credibility Evaluation Engine
 */
export async function evaluateReportCredibility(
  report: UserReport,
  existingClusterReportsCount: number,
  isAutoPilotEnabled: boolean = true,
  autoApproveThreshold: number = 0.85,
  minClusterCountForAutoApprove: number = 5
): Promise<ModerationEvaluationResult> {
  const reportTime = report.reportedAt ? new Date(report.reportedAt) : new Date();

  // --- TRỤ CỘT 1: Khí tượng & Thủy văn thực tế (Trọng số 35%) ---
  let weatherPillar = 0.1; // Default low if completely dry
  let weatherDesc = 'Thời tiết khô ráo, triều bình thường';
  try {
    const rollingRain = await getAllQuadrantsRollingPrecipitation(reportTime);
    const tide = getSaigonTideStatus(reportTime);

    const maxRain = Math.max(
      rollingRain.center.currentMm,
      rollingRain.south.currentMm,
      rollingRain.east.currentMm,
      rollingRain.northwest.currentMm
    );

    if (maxRain >= 20 || tide.tideHeightM >= 1.50) {
      weatherPillar = 1.0;
      weatherDesc = `Mưa lớn (${maxRain.toFixed(1)}mm) hoặc triều cường cao (${tide.tideHeightM}m)`;
    } else if (maxRain >= 8 || tide.tideHeightM >= 1.35) {
      weatherPillar = 0.65;
      weatherDesc = `Có mưa vừa (${maxRain.toFixed(1)}mm) hoặc triều dâng (${tide.tideHeightM}m)`;
    } else if (maxRain >= 3) {
      weatherPillar = 0.40;
      weatherDesc = `Mưa nhỏ rải rác (${maxRain.toFixed(1)}mm)`;
    } else {
      weatherPillar = 0.10;
      weatherDesc = 'Thời tiết khô ráo, không có triều cường';
    }
  } catch (err) {
    weatherPillar = 0.35;
    weatherDesc = 'Không lấy được dữ liệu radar thời tiết';
  }

  // --- TRỤ CỘT 2: Gom cụm không gian & Số lượng người báo (Trọng số 35%) ---
  // Ngưỡng do người dùng phê duyệt: 1-2 người = 20%, 3-4 người = 60%, >= 5 người = 100%
  let clusteringPillar = 0.20;
  let clusterDesc = `${existingClusterReportsCount} người báo`;

  if (existingClusterReportsCount >= 5) {
    clusteringPillar = 1.0;
    clusterDesc = `Cộng đồng đồng thuận cao (${existingClusterReportsCount} người báo)`;
  } else if (existingClusterReportsCount >= 3) {
    clusteringPillar = 0.60;
    clusterDesc = `Tín hiệu gom cụm trung bình (${existingClusterReportsCount} người báo)`;
  } else {
    clusteringPillar = 0.20;
    clusterDesc = `Tín hiệu đơn lẻ (${existingClusterReportsCount} người báo)`;
  }

  // --- TRỤ CỘT 3: Phân tích ngữ nghĩa NLP (Trọng số 20%) ---
  let semanticPillar = 0.5;
  let semanticDesc = 'Mô tả thông thường';
  const desc = (report.description || '').toLowerCase().trim();

  if (!desc) {
    semanticPillar = 0.4;
    semanticDesc = 'Không có mô tả chi tiết';
  } else {
    const hasSpam = SPAM_KEYWORDS.some((kw) => desc.includes(kw));
    if (hasSpam) {
      semanticPillar = 0.0;
      semanticDesc = 'Phát hiện từ ngữ spam / đùa cợt / phi lý';
    } else {
      const matchCount = REALISTIC_KEYWORDS.filter((kw) => desc.includes(kw)).length;
      if (matchCount >= 2) {
        semanticPillar = 1.0;
        semanticDesc = 'Mô tả chi tiết và có độ chân thực cao';
      } else if (matchCount === 1) {
        semanticPillar = 0.75;
        semanticDesc = 'Mô tả có chứa đặc điểm hiện trường';
      } else {
        semanticPillar = 0.50;
        semanticDesc = 'Mô tả ngắn';
      }
    }
  }

  // --- TRỤ CỘT 4: Mức độ nhạy cảm địa hình (Trọng số 10%) ---
  let topographicPillar = 0.4;
  let nearestCorridorName = '';
  for (const corridor of HCMC_VULNERABLE_CORRIDORS) {
    const dist = calculateDistanceMeters(
      report.coordinate.lat,
      report.coordinate.lng,
      corridor.coordinate[1],
      corridor.coordinate[0]
    );
    if (dist <= 450) {
      topographicPillar = 1.0;
      nearestCorridorName = corridor.streetName;
      break;
    }
  }

  // --- TỔNG HỢP ĐIỂM TIN CẬY (0.00 - 1.00) ---
  const rawScore =
    weatherPillar * 0.35 +
    clusteringPillar * 0.35 +
    semanticPillar * 0.20 +
    topographicPillar * 0.10;

  const confidenceScore = Math.round(Math.min(1.0, Math.max(0.0, rawScore)) * 100) / 100;

  // Strict Auto-Approve check:
  // Must have: >= 5 independent reports, confidenceScore >= 0.85, and Auto-Pilot enabled
  const canAutoApprove =
    isAutoPilotEnabled &&
    confidenceScore >= autoApproveThreshold &&
    existingClusterReportsCount >= minClusterCountForAutoApprove;

  const reasoningParts: string[] = [];
  reasoningParts.push(weatherDesc);
  reasoningParts.push(clusterDesc);
  if (nearestCorridorName) {
    reasoningParts.push(`Gần trục hay ngập ${nearestCorridorName}`);
  }
  reasoningParts.push(semanticDesc);

  const aiReasoning = `${reasoningParts.join(' • ')} (Độ tin cậy: ${Math.round(confidenceScore * 100)}%)`;

  return {
    confidenceScore,
    aiReasoning,
    pillarScores: {
      weatherPillar,
      clusteringPillar,
      semanticPillar,
      topographicPillar,
    },
    canAutoApprove,
  };
}
