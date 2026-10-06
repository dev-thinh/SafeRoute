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
  isSpam?: boolean;
}

export interface SpamDetectionResult {
  isSpam: boolean;
  reason: string;
  spamType?: 'gibberish' | 'numbers_only' | 'repeated_chars' | 'keyboard_mash' | 'spam_keyword' | 'too_short';
}

export const SPAM_KEYWORDS = [
  'troll', 'haha', 'hihi', 'hehe', 'huhu', 'nóc nhà', 'lầu 3', 'lầu 4', 'lầu 5', 'chết hết', 'tàu ngầm',
  'bơi xuồng trong nhà', 'bơi xuồng', 'ngập 10m', 'ngập 5m', 'ngập 3m', 'ngập 2m', 'đĩ', 'đụ', 'đéo',
  'vcl', 'clgt', 'dm', 'dcm', 'vkl', 'cặc', 'lồn', 'đua thuyền', 'cá mập', 'tàu chiến', 'thủy cung'
];

export const COMMON_MASH_STRINGS = new Set([
  'asd', 'asdf', 'asdfg', 'asdfgh', 'zxc', 'zxcv', 'qwe', 'qwer', 'qwerty',
  'jkl', 'hjkl', 'abc', 'abcd', 'xyz', 'test', 'testing', 'demo', 'check',
  'alo', 'xxx', 'zzz', 'bla', 'blabla', '123', '1234', '12345', '123456',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'
]);

export const VALID_SHORT_WORDS = new Set([
  'ngập', 'sâu', 'mưa', 'kẹt', 'tắc', 'pô', 'bánh', 'dâng', 'lụt', 'nước', 'tràn', 'xe', 'to', 'lớn', 'nặng'
]);

/**
 * Detects whether a report description is gibberish, spam, keyboard mashing, or nonsense.
 */
export function detectGibberishOrSpam(text?: string): SpamDetectionResult {
  if (!text || !text.trim()) {
    return { isSpam: false, reason: 'Không có mô tả chi tiết' };
  }

  const trimmed = text.trim();
  const clean = trimmed.toLowerCase();
  const noPunct = clean.replace(/[\s\-_.,!?]/g, '');

  // 1. Only numbers (e.g. "123", "12345")
  if (/^\d+$/i.test(noPunct)) {
    return {
      isSpam: true,
      reason: `Nội dung chỉ toàn chữ số vô nghĩa ("${trimmed}")`,
      spamType: 'numbers_only',
    };
  }

  // 2. Only punctuation/special characters (e.g. "...", "???", "!@#$")
  if (!/[a-zA-Z0-9àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(clean)) {
    return {
      isSpam: true,
      reason: `Nội dung chỉ gồm ký tự đặc biệt ("${trimmed}")`,
      spamType: 'gibberish',
    };
  }

  // 3. Explicit troll / forbidden spam keywords
  for (const kw of SPAM_KEYWORDS) {
    if (clean.includes(kw)) {
      return {
        isSpam: true,
        reason: `Phát hiện từ khóa đùa cợt / spam phi lý ("${kw}")`,
        spamType: 'spam_keyword',
      };
    }
  }

  // 4. Keyboard mashing & test strings (e.g. "asd", "asdf", "test", "qwe")
  if (COMMON_MASH_STRINGS.has(clean) || COMMON_MASH_STRINGS.has(noPunct)) {
    return {
      isSpam: true,
      reason: `Nội dung gõ phím ngẫu nhiên / test thử ("${trimmed}")`,
      spamType: 'keyboard_mash',
    };
  }

  // 5. Repeated identical character >= 3 times (e.g. "aaaa", "1111", ".....")
  if (/(.)\1{2,}/i.test(clean)) {
    return {
      isSpam: true,
      reason: `Ký tự lặp lại vô nghĩa ("${trimmed}")`,
      spamType: 'repeated_chars',
    };
  }

  // 6. Repeated pattern of 2-4 characters >= 2 times (e.g. "asdasd", "121212", "abcabc")
  if (/(.{2,4})\1{2,}/i.test(noPunct)) {
    return {
      isSpam: true,
      reason: `Mẫu ký tự lặp lại vô nghĩa ("${trimmed}")`,
      spamType: 'repeated_chars',
    };
  }

  // 7. Very short description (< 5 characters) without any valid flood context words
  if (clean.length < 5) {
    const words = clean.split(/\s+/);
    const hasValidWord = words.some((w) => VALID_SHORT_WORDS.has(w));
    if (!hasValidWord) {
      return {
        isSpam: true,
        reason: `Nội dung quá ngắn và vô nghĩa ("${trimmed}")`,
        spamType: 'too_short',
      };
    }
  }

  // 8. Word with >= 4 characters but NO vowels at all (e.g. "sdfgh", "zxcvb", "dfgh")
  const words = clean.split(/\s+/).filter((w) => w.length >= 4);
  const vowelRegex = /[aeiouyáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ]/i;
  for (const word of words) {
    if (!vowelRegex.test(word)) {
      return {
        isSpam: true,
        reason: `Chuỗi ký tự không có nguyên âm hợp lệ ("${trimmed}")`,
        spamType: 'keyboard_mash',
      };
    }
  }

  return { isSpam: false, reason: 'Nội dung hợp lệ' };
}

export const REALISTIC_KEYWORDS = [
  'chết máy', 'ngập pô', 'nửa bánh', 'bánh xe', 'mắt cá', 'đầu gối', 'dắt bộ',
  'mưa lớn', 'triều', 'nước dâng', 'nước ngập', 'trước cổng', 'chợ', 'ngã tư',
  'ngã ba', 'cầu', 'hẻm', 'đường', 'kẹt xe', 'tràn bờ', 'xe máy', 'ô tô'
];

/**
 * 4-Pillar AI Credibility Evaluation Engine with Anti-Spam Veto Gatekeeper
 */
export async function evaluateReportCredibility(
  report: UserReport,
  existingClusterReportsCount: number,
  isAutoPilotEnabled: boolean = true,
  autoApproveThreshold: number = 0.85,
  minClusterCountForAutoApprove: number = 5
): Promise<ModerationEvaluationResult> {
  const reportTime = report.reportedAt ? new Date(report.reportedAt) : new Date();

  // --- KIỂM TRA PHÁT HIỆN SPAM / NỘI DUNG VÔ NGHĨA (TIỀN KIỂM SOÁT) ---
  const spamCheck = detectGibberishOrSpam(report.description);
  const isSpam = spamCheck.isSpam;

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

    if (maxRain >= 20 || tide.peakTideHeightM >= 1.50) {
      weatherPillar = 1.0;
      weatherDesc = `Mưa lớn (${maxRain.toFixed(1)}mm) hoặc triều cường cao (${tide.peakTideHeightM}m)`;
    } else if (maxRain >= 8 || tide.peakTideHeightM >= 1.35) {
      weatherPillar = 0.65;
      weatherDesc = `Có mưa vừa (${maxRain.toFixed(1)}mm) hoặc triều dâng (${tide.peakTideHeightM}m)`;
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
  // Ngưỡng: 1-2 người = 20%, 3-4 người = 60%, >= 5 người = 100%
  // NẾU LÀ SPAM: Không được cộng điểm gom cụm!
  let clusteringPillar = 0.20;
  let clusterDesc = `${existingClusterReportsCount} người báo`;

  if (isSpam) {
    clusteringPillar = 0.0;
    clusterDesc = 'Tin báo rác không hợp lệ';
  } else if (existingClusterReportsCount >= 5) {
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

  if (isSpam) {
    semanticPillar = 0.0;
    semanticDesc = spamCheck.reason;
  } else if (!desc) {
    semanticPillar = 0.35;
    semanticDesc = 'Không có mô tả chi tiết';
  } else {
    const matchCount = REALISTIC_KEYWORDS.filter((kw) => desc.includes(kw)).length;
    if (matchCount >= 2) {
      semanticPillar = 1.0;
      semanticDesc = 'Mô tả chi tiết và có độ chân thực cao';
    } else if (matchCount === 1) {
      semanticPillar = 0.75;
      semanticDesc = 'Mô tả có chứa đặc điểm hiện trường';
    } else {
      semanticPillar = 0.60;
      semanticDesc = 'Mô tả hợp lệ';
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

  let confidenceScore = Math.round(Math.min(1.0, Math.max(0.0, rawScore)) * 100) / 100;

  // --- CƠ CHẾ VETO (ĐIỂM LIỆT) TUYỆT ĐỐI CHO NỘI DUNG SPAM / VÔ NGHĨA ---
  if (isSpam) {
    // VETO: Điểm tin cậy bị khoá trần tối đa 5% (0.05), bất kể thời tiết hay số lượng báo cáo!
    confidenceScore = 0.05;
  }

  // Strict Auto-Approve check:
  // Must NOT be spam, must have >= 5 independent reports, confidenceScore >= 0.85, and Auto-Pilot enabled
  const canAutoApprove =
    !isSpam &&
    isAutoPilotEnabled &&
    confidenceScore >= autoApproveThreshold &&
    existingClusterReportsCount >= minClusterCountForAutoApprove;

  let aiReasoning = '';
  if (isSpam) {
    aiReasoning = `CẢNH BÁO SPAM: ${spamCheck.reason} • Điểm liệt VETO (Độ tin cậy: ${Math.round(confidenceScore * 100)}%)`;
  } else {
    const reasoningParts: string[] = [];
    reasoningParts.push(weatherDesc);
    reasoningParts.push(clusterDesc);
    if (nearestCorridorName) {
      reasoningParts.push(`Gần trục hay ngập ${nearestCorridorName}`);
    }
    reasoningParts.push(semanticDesc);
    aiReasoning = `${reasoningParts.join(' • ')} (Độ tin cậy: ${Math.round(confidenceScore * 100)}%)`;
  }

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
    isSpam,
  };
}
