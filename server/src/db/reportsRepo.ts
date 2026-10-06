import { pool } from './pool';
import { isDbConnected } from './initDb';
import { UserReport, ReportCluster, AdminSettings } from '../types';
import { evaluateReportCredibility, calculateDistanceMeters, detectGibberishOrSpam } from '../services/aiModerationService';

export const REPORT_BASE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
export const REPORT_MAX_LIFETIME_MS = 12 * 60 * 60 * 1000; // 12 hours

export const inMemoryReports: UserReport[] = [];

export let adminSettings: AdminSettings = {
  isAutoPilotEnabled: true,
  autoApproveThreshold: 0.85,
  minClusterCountForAutoApprove: 5,
};

export function getAdminSettings(): AdminSettings {
  return { ...adminSettings };
}

export function updateAdminSettings(newSettings: Partial<AdminSettings>): AdminSettings {
  adminSettings = { ...adminSettings, ...newSettings };
  return { ...adminSettings };
}

// Rate Limiting & Anti-Spam Tracking Per Client
interface ClientSubmissionRecord {
  timestamp: number;
  lat: number;
  lng: number;
}

export const clientSubmissionHistory = new Map<string, ClientSubmissionRecord[]>();

export interface SpamLimitCheckResult {
  allowed: boolean;
  message?: string;
}

/**
 * Checks if a client is spamming reports or repeatedly reporting the same location within 150m.
 */
export function checkClientSpamLimits(
  clientIdentifier: string,
  newCoord: { lat: number; lng: number }
): SpamLimitCheckResult {
  const now = Date.now();
  const records = clientSubmissionHistory.get(clientIdentifier) || [];

  // Keep records from the last 2 hours
  const validRecords = records.filter((r) => now - r.timestamp < 2 * 60 * 60 * 1000);

  // 1. Check duplicate report at the same location (within 150m) in the last 2 hours
  for (const r of validRecords) {
    const dist = calculateDistanceMeters(newCoord.lat, newCoord.lng, r.lat, r.lng);
    if (dist <= 150) {
      return {
        allowed: false,
        message: 'Bạn đã gửi báo cáo ngập tại khu vực này rồi. Hệ thống đã ghi nhận và đang kiểm duyệt.',
      };
    }
  }

  // 2. Check flooding across multiple locations (> 3 reports within 5 minutes)
  const recentIn5Min = validRecords.filter((r) => now - r.timestamp < 5 * 60 * 1000);
  if (recentIn5Min.length >= 3) {
    return {
      allowed: false,
      message: 'Bạn đang gửi báo cáo quá nhanh. Hệ thống tạm khóa 5 phút để bảo vệ dữ liệu.',
    };
  }

  validRecords.push({ timestamp: now, lat: newCoord.lat, lng: newCoord.lng });
  clientSubmissionHistory.set(clientIdentifier, validRecords);

  return { allowed: true };
}

/**
 * Clusters reports spatially where any two reports within maxDistanceMeters (550m)
 * are merged into a single report cluster.
 */
export function clusterReportsSpatially(
  reports: UserReport[],
  maxDistanceMeters: number = 550
): UserReport[][] {
  const clusters: UserReport[][] = [];

  for (const report of reports) {
    let matchedCluster: UserReport[] | null = null;

    for (const cluster of clusters) {
      const isNearby = cluster.some((existing) => {
        const dist = calculateDistanceMeters(
          report.coordinate.lat,
          report.coordinate.lng,
          existing.coordinate.lat,
          existing.coordinate.lng
        );
        return dist <= maxDistanceMeters;
      });

      if (isNearby) {
        matchedCluster = cluster;
        break;
      }
    }

    if (matchedCluster) {
      matchedCluster.push(report);
    } else {
      clusters.push([report]);
    }
  }

  return clusters;
}

/**
 * Gets all recent reports for clustering (within 2 hours).
 */
async function getAllRecentReports(): Promise<UserReport[]> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        `SELECT 
          id, 
          ST_X(location_geom) as lng, 
          ST_Y(location_geom) as lat, 
          depth_level as "depthLevel", 
          depth_cm as "depthCm", 
          description, 
          image_url as "imageUrl", 
          upvotes, 
          downvotes, 
          status, 
          reported_at as "reportedAt",
          COALESCE(last_verified_at, reported_at) as "lastVerifiedAt",
          ai_confidence as "aiConfidence",
          ai_reasoning as "aiReasoning",
          cluster_id as "clusterId",
          is_auto_approved as "isAutoApproved",
          reviewed_by as "reviewedBy",
          reviewed_at as "reviewedAt"
         FROM user_reports 
         WHERE reported_at >= NOW() - INTERVAL '2 hours'
         ORDER BY reported_at DESC`
      );
      if (res.rows.length > 0) {
        return res.rows.map((r: any) => ({
          id: r.id,
          coordinate: { lat: parseFloat(r.lat), lng: parseFloat(r.lng) },
          depthLevel: r.depthLevel,
          depthCm: r.depthCm,
          description: r.description,
          imageUrl: r.imageUrl,
          reportedAt: new Date(r.reportedAt),
          lastVerifiedAt: new Date(r.lastVerifiedAt),
          upvotes: r.upvotes,
          downvotes: r.downvotes,
          status: r.status,
          aiConfidence: r.aiConfidence !== null ? parseFloat(r.aiConfidence) : undefined,
          aiReasoning: r.aiReasoning || undefined,
          clusterId: r.clusterId || undefined,
          isAutoApproved: Boolean(r.isAutoApproved),
          reviewedBy: r.reviewedBy || undefined,
          reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : undefined,
        }));
      }
    } catch (err: any) {
      console.warn('Failed to query recent reports from DB:', err.message);
    }
  }

  const cutoff = Date.now() - 2 * 3600 * 1000;
  return inMemoryReports.filter((r) => new Date(r.reportedAt).getTime() >= cutoff);
}

/**
 * Saves a new user flood report with AI 4-Pillar moderation & spatial clustering.
 */
export async function saveReport(report: UserReport): Promise<UserReport> {
  const now = report.reportedAt ? new Date(report.reportedAt) : new Date();
  if (!report.lastVerifiedAt) {
    report.lastVerifiedAt = now;
  }

  // 1. Find existing cluster within 550m and 45 minutes
  const recentReports = await getAllRecentReports();
  const clusterReports: UserReport[] = [];
  let assignedClusterId = report.clusterId;

  for (const r of recentReports) {
    const diffMs = Math.abs(now.getTime() - new Date(r.reportedAt).getTime());
    if (diffMs <= 45 * 60 * 1000) {
      const dist = calculateDistanceMeters(
        report.coordinate.lat,
        report.coordinate.lng,
        r.coordinate.lat,
        r.coordinate.lng
      );
      if (dist <= 550) {
        clusterReports.push(r);
        if (!assignedClusterId && r.clusterId) {
          assignedClusterId = r.clusterId;
        }
      }
    }
  }

  if (!assignedClusterId) {
    assignedClusterId = `cluster-${report.id.substring(0, 8)}`;
  }
  report.clusterId = assignedClusterId;

  // 2. Run 4-Pillar AI Credibility Evaluation with Anti-Spam Gatekeeper
  const currentSpamCheck = detectGibberishOrSpam(report.description);
  
  // Only count VALID (non-spam, aiConfidence > 0.15) reports in cluster count
  const validClusterReports = clusterReports.filter((r) => {
    const isSpam = detectGibberishOrSpam(r.description).isSpam;
    const conf = r.aiConfidence ?? 0.5;
    return !isSpam && conf > 0.15;
  });

  // If current report is spam, valid cluster count is 0.
  // Otherwise, count is validClusterReports + 1
  const validClusterCount = currentSpamCheck.isSpam ? 0 : (validClusterReports.length + 1);

  const evalResult = await evaluateReportCredibility(
    report,
    validClusterCount,
    adminSettings.isAutoPilotEnabled,
    adminSettings.autoApproveThreshold,
    adminSettings.minClusterCountForAutoApprove
  );

  report.aiConfidence = evalResult.confidenceScore;
  report.aiReasoning = evalResult.aiReasoning;

  if (evalResult.canAutoApprove) {
    report.status = 'approved';
    report.isAutoApproved = true;
    report.reviewedBy = 'ai';
    report.reviewedAt = now;

    // Auto-promote all other pending reports in the same cluster
    for (const r of clusterReports) {
      if (r.status === 'pending') {
        r.status = 'approved';
        r.isAutoApproved = true;
        r.reviewedBy = 'ai';
        r.reviewedAt = now;
        if (isDbConnected) {
          pool.query(`UPDATE user_reports SET status = 'approved', is_auto_approved = true, reviewed_by = 'ai', reviewed_at = NOW() WHERE id::text = $1`, [r.id]).catch(() => {});
        }
      }
    }
  } else {
    report.status = 'pending';
    report.isAutoApproved = false;
  }

  // 3. Save to In-Memory store
  inMemoryReports.unshift(report);

  // 4. Save to PostgreSQL if connected
  if (isDbConnected) {
    try {
      await pool.query(
        `INSERT INTO user_reports 
          (id, location_geom, address_text, depth_level, depth_cm, description, image_url, upvotes, downvotes, status, reported_at, last_verified_at, ai_confidence, ai_reasoning, cluster_id, is_auto_approved, reviewed_by, reviewed_at)
         VALUES 
          ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          report.id,
          report.coordinate.lng,
          report.coordinate.lat,
          report.description || 'Báo cáo cộng đồng',
          report.depthLevel,
          report.depthCm,
          report.description || null,
          report.imageUrl || null,
          report.upvotes,
          report.downvotes,
          report.status,
          report.reportedAt,
          report.lastVerifiedAt,
          report.aiConfidence,
          report.aiReasoning,
          report.clusterId,
          report.isAutoApproved,
          report.reviewedBy || null,
          report.reviewedAt || null,
        ]
      );
    } catch (err: any) {
      console.warn('Failed to insert report into PostgreSQL:', err.message);
    }
  }

  return report;
}

/**
 * Fetches all active & approved user reports within valid TTL.
 * Pending or rejected reports are NEVER returned to the public map or routing engine!
 */
export async function getActiveReports(targetTime?: Date): Promise<UserReport[]> {
  const queryTime = targetTime || new Date();

  if (isDbConnected) {
    try {
      const res = await pool.query(
        `SELECT 
          id, 
          ST_X(location_geom) as lng, 
          ST_Y(location_geom) as lat, 
          depth_level as "depthLevel", 
          depth_cm as "depthCm", 
          description, 
          image_url as "imageUrl", 
          upvotes, 
          downvotes, 
          status, 
          reported_at as "reportedAt",
          COALESCE(last_verified_at, reported_at) as "lastVerifiedAt",
          ai_confidence as "aiConfidence",
          ai_reasoning as "aiReasoning",
          cluster_id as "clusterId",
          is_auto_approved as "isAutoApproved",
          reviewed_by as "reviewedBy",
          reviewed_at as "reviewedAt"
         FROM user_reports 
         WHERE (status = 'approved' OR status = 'active')
           AND reported_at >= $1::timestamptz - INTERVAL '12 hours'
           AND COALESCE(last_verified_at, reported_at) >= $1::timestamptz - INTERVAL '3 hours'
         ORDER BY reported_at DESC`,
        [queryTime]
      );
      if (res.rows.length > 0) {
        return res.rows.map((r: any) => ({
          id: r.id,
          coordinate: { lat: parseFloat(r.lat), lng: parseFloat(r.lng) },
          depthLevel: r.depthLevel,
          depthCm: r.depthCm,
          description: r.description,
          imageUrl: r.imageUrl,
          reportedAt: new Date(r.reportedAt),
          lastVerifiedAt: new Date(r.lastVerifiedAt),
          upvotes: r.upvotes,
          downvotes: r.downvotes,
          status: r.status,
          aiConfidence: r.aiConfidence !== null ? parseFloat(r.aiConfidence) : undefined,
          aiReasoning: r.aiReasoning || undefined,
          clusterId: r.clusterId || undefined,
          isAutoApproved: Boolean(r.isAutoApproved),
          reviewedBy: r.reviewedBy || undefined,
          reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : undefined,
        }));
      }
      return [];
    } catch (err: any) {
      console.warn('Failed to read approved reports from PostgreSQL:', err.message);
    }
  }

  const refTimeMs = queryTime.getTime();
  return inMemoryReports.filter((r) => {
    if (r.status !== 'approved' && r.status !== 'active') return false;
    const reportedTimeMs = new Date(r.reportedAt).getTime();
    const verifiedTimeMs = new Date(r.lastVerifiedAt || r.reportedAt).getTime();

    if (refTimeMs - reportedTimeMs > REPORT_MAX_LIFETIME_MS) return false;
    if (refTimeMs - verifiedTimeMs > REPORT_BASE_TTL_MS) return false;

    return true;
  });
}

/**
 * Updates votes on a user report in PostgreSQL (and in-memory).
 */
export async function voteReport(id: string, type: 'upvote' | 'resolved'): Promise<UserReport | null> {
  const memReport = inMemoryReports.find((r) => r.id === id);
  const now = new Date();

  if (memReport) {
    if (type === 'resolved') {
      memReport.downvotes += 1;
    } else {
      memReport.upvotes += 1;
      const reportedTimeMs = new Date(memReport.reportedAt).getTime();
      if (now.getTime() - reportedTimeMs <= REPORT_MAX_LIFETIME_MS) {
        memReport.lastVerifiedAt = now;
      }
    }

    const totalVotes = memReport.upvotes + memReport.downvotes;
    if (totalVotes >= 3 && (memReport.downvotes / totalVotes) >= 0.60) {
      memReport.status = 'resolved';
    } else if (memReport.status === 'resolved' && (memReport.downvotes / totalVotes) < 0.60) {
      memReport.status = 'approved';
    }
  }

  if (isDbConnected) {
    try {
      const updateQuery = type === 'resolved'
        ? `UPDATE user_reports 
           SET downvotes = downvotes + 1, 
               status = CASE 
                 WHEN (upvotes + downvotes + 1 >= 3) AND ((downvotes + 1)::float / (upvotes + downvotes + 1)::float >= 0.60) 
                 THEN 'resolved' 
                 ELSE status 
               END 
           WHERE id::text = $1
           RETURNING id, ST_X(location_geom) as lng, ST_Y(location_geom) as lat, depth_level as "depthLevel", depth_cm as "depthCm", description, image_url as "imageUrl", upvotes, downvotes, status, reported_at as "reportedAt", COALESCE(last_verified_at, reported_at) as "lastVerifiedAt", ai_confidence as "aiConfidence", ai_reasoning as "aiReasoning", cluster_id as "clusterId", is_auto_approved as "isAutoApproved", reviewed_by as "reviewedBy", reviewed_at as "reviewedAt"`
        : `UPDATE user_reports 
           SET upvotes = upvotes + 1,
               last_verified_at = CASE 
                 WHEN NOW() - reported_at <= INTERVAL '12 hours' THEN NOW() 
                 ELSE last_verified_at 
               END,
               status = CASE 
                 WHEN (upvotes + 1 + downvotes >= 3) AND (downvotes::float / (upvotes + 1 + downvotes)::float >= 0.60) 
                 THEN 'resolved' 
                 ELSE 'approved' 
               END 
           WHERE id::text = $1
           RETURNING id, ST_X(location_geom) as lng, ST_Y(location_geom) as lat, depth_level as "depthLevel", depth_cm as "depthCm", description, image_url as "imageUrl", upvotes, downvotes, status, reported_at as "reportedAt", COALESCE(last_verified_at, reported_at) as "lastVerifiedAt", ai_confidence as "aiConfidence", ai_reasoning as "aiReasoning", cluster_id as "clusterId", is_auto_approved as "isAutoApproved", reviewed_by as "reviewedBy", reviewed_at as "reviewedAt"`;

      const res = await pool.query(updateQuery, [id]);
      if (res.rows.length > 0) {
        const r = res.rows[0];
        const dbUpdated: UserReport = {
          id: r.id,
          coordinate: { lat: parseFloat(r.lat), lng: parseFloat(r.lng) },
          depthLevel: r.depthLevel,
          depthCm: r.depthCm,
          description: r.description,
          imageUrl: r.imageUrl,
          reportedAt: new Date(r.reportedAt),
          lastVerifiedAt: new Date(r.lastVerifiedAt),
          upvotes: r.upvotes,
          downvotes: r.downvotes,
          status: r.status,
          aiConfidence: r.aiConfidence !== null ? parseFloat(r.aiConfidence) : undefined,
          aiReasoning: r.aiReasoning || undefined,
          clusterId: r.clusterId || undefined,
          isAutoApproved: Boolean(r.isAutoApproved),
          reviewedBy: r.reviewedBy || undefined,
          reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : undefined,
        };
        if (!memReport) {
          inMemoryReports.unshift(dbUpdated);
        }
        return memReport || dbUpdated;
      }
    } catch (err: any) {
      console.warn('Failed to update report in PostgreSQL:', err.message);
    }
  }

  return memReport || null;
}

// ==========================================
// ADMIN MODERATION & CLUSTER MANAGEMENT
// ==========================================

/**
 * Returns all report clusters for Admin review.
 */
export async function getAdminReportClusters(): Promise<ReportCluster[]> {
  let reports: UserReport[] = [];

  if (isDbConnected) {
    try {
      const res = await pool.query(
        `SELECT 
          id, 
          ST_X(location_geom) as lng, 
          ST_Y(location_geom) as lat, 
          address_text as "addressText",
          depth_level as "depthLevel", 
          depth_cm as "depthCm", 
          description, 
          image_url as "imageUrl", 
          upvotes, 
          downvotes, 
          status, 
          reported_at as "reportedAt",
          COALESCE(last_verified_at, reported_at) as "lastVerifiedAt",
          ai_confidence as "aiConfidence",
          ai_reasoning as "aiReasoning",
          cluster_id as "clusterId",
          is_auto_approved as "isAutoApproved",
          reviewed_by as "reviewedBy",
          reviewed_at as "reviewedAt"
         FROM user_reports 
         WHERE status NOT IN ('rejected', 'resolved')
           AND reported_at >= NOW() - INTERVAL '24 hours'
         ORDER BY reported_at DESC`
      );
      if (res.rows.length > 0) {
        reports = res.rows.map((r: any) => ({
          id: r.id,
          coordinate: { lat: parseFloat(r.lat), lng: parseFloat(r.lng) },
          depthLevel: r.depthLevel,
          depthCm: r.depthCm,
          description: r.description,
          imageUrl: r.imageUrl,
          reportedAt: new Date(r.reportedAt),
          lastVerifiedAt: new Date(r.lastVerifiedAt),
          upvotes: r.upvotes,
          downvotes: r.downvotes,
          status: r.status,
          aiConfidence: r.aiConfidence !== null ? parseFloat(r.aiConfidence) : 0.5,
          aiReasoning: r.aiReasoning || 'Chờ đánh giá',
          clusterId: r.clusterId || `cluster-${r.id.substring(0, 8)}`,
          isAutoApproved: Boolean(r.isAutoApproved),
          reviewedBy: r.reviewedBy || undefined,
          reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : undefined,
        }));
      }
    } catch (err: any) {
      console.warn('Failed to load admin reports from DB:', err.message);
    }
  }

  if (reports.length === 0) {
    const cutoff = Date.now() - 24 * 3600 * 1000;
    reports = inMemoryReports.filter(
      (r) =>
        r.status !== 'rejected' &&
        r.status !== 'resolved' &&
        new Date(r.reportedAt).getTime() >= cutoff
    );
  } else {
    reports = reports.filter((r) => r.status !== 'rejected' && r.status !== 'resolved');
  }

  // 550m Spatial Clustering: all reports within 550m are grouped into ONE cluster
  const spatialGroups = clusterReportsSpatially(reports, 550);

  const clusters: ReportCluster[] = [];
  for (const clusterReports of spatialGroups) {
    const totalReports = clusterReports.length;
    const first = clusterReports[0];

    // Harmonize common clusterId across this spatial cluster
    const commonClusterId =
      clusterReports.find((r) => r.clusterId)?.clusterId ||
      `cluster-${first.id.substring(0, 8)}`;
    for (const r of clusterReports) {
      r.clusterId = commonClusterId;
    }

    const avgDepthCm = Math.round(
      clusterReports.reduce((sum, r) => sum + r.depthCm, 0) / totalReports
    );

    // Filter valid vs spam reports in cluster
    const spamReportsInCluster = clusterReports.filter(
      (r) => detectGibberishOrSpam(r.description).isSpam || (r.aiConfidence ?? 0.5) <= 0.15
    );
    const validReportsInCluster = clusterReports.filter(
      (r) => !detectGibberishOrSpam(r.description).isSpam && (r.aiConfidence ?? 0.5) > 0.15
    );

    let maxConfidence: number;
    let representativeReason: string;

    if (validReportsInCluster.length === 0) {
      // Entire cluster consists of spam/gibberish reports!
      maxConfidence = 0.05;
      representativeReason = `Cụm nghi vấn spam: Toàn bộ ${totalReports} báo cáo chứa nội dung rác / gõ phím vô nghĩa • Độ tin cậy: 5%`;
    } else {
      maxConfidence = Math.max(...validReportsInCluster.map((r) => r.aiConfidence || 0.5));
      const repValid = validReportsInCluster.find((r) => r.aiReasoning);
      representativeReason = repValid?.aiReasoning || 'Chờ đánh giá';
      if (spamReportsInCluster.length > 0) {
        representativeReason += ` (Lưu ý: Có ${spamReportsInCluster.length}/${totalReports} tin rác bị loại bỏ)`;
      }
    }

    // Status: approved if any is approved/active, else pending (rejected are already filtered out)
    let status: 'pending' | 'approved' | 'rejected' = 'pending';
    if (clusterReports.some((r) => r.status === 'approved' || r.status === 'active')) {
      status = 'approved';
    } else if (clusterReports.every((r) => r.status === 'rejected')) {
      status = 'rejected';
    }

    clusters.push({
      clusterId: commonClusterId,
      coordinate: first.coordinate,
      totalReports,
      depthLevel: first.depthLevel,
      avgDepthCm,
      latestReportedAt: new Date(
        Math.max(...clusterReports.map((r) => new Date(r.reportedAt).getTime()))
      ),
      aiConfidence: maxConfidence,
      aiReasoning: representativeReason,
      canAutoApprove:
        validReportsInCluster.length >= adminSettings.minClusterCountForAutoApprove &&
        maxConfidence >= adminSettings.autoApproveThreshold,
      status,
      reports: clusterReports,
    });
  }

  // Sort clusters: pending first, then by totalReports desc
  return clusters.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return b.totalReports - a.totalReports;
  });
}

/**
 * Admin approves a single report.
 */
export async function approveReport(id: string): Promise<UserReport | null> {
  const report = inMemoryReports.find((r) => r.id === id);
  const now = new Date();
  if (report) {
    report.status = 'approved';
    report.reviewedBy = 'admin';
    report.reviewedAt = now;
  }

  if (isDbConnected) {
    try {
      await pool.query(
        `UPDATE user_reports 
         SET status = 'approved', reviewed_by = 'admin', reviewed_at = NOW() 
         WHERE id::text = $1`,
        [id]
      );
    } catch (err: any) {
      console.warn('Failed to approve report in DB:', err.message);
    }
  }

  return report || null;
}

/**
 * Admin rejects a single report.
 */
export async function rejectReport(id: string): Promise<UserReport | null> {
  const report = inMemoryReports.find((r) => r.id === id);
  const now = new Date();
  if (report) {
    report.status = 'rejected';
    report.reviewedBy = 'admin';
    report.reviewedAt = now;
  }

  if (isDbConnected) {
    try {
      await pool.query(
        `UPDATE user_reports 
         SET status = 'rejected', reviewed_by = 'admin', reviewed_at = NOW() 
         WHERE id::text = $1`,
        [id]
      );
    } catch (err: any) {
      console.warn('Failed to reject report in DB:', err.message);
    }
  }

  return report || null;
}

/**
 * Admin approves an entire cluster of reports.
 */
export async function approveCluster(clusterId: string): Promise<number> {
  const now = new Date();
  let count = 0;
  const targetReportIds: string[] = [];

  for (const r of inMemoryReports) {
    if (r.clusterId === clusterId || `cluster-${r.id.substring(0, 8)}` === clusterId) {
      r.status = 'approved';
      r.reviewedBy = 'admin';
      r.reviewedAt = now;
      targetReportIds.push(r.id);
      count++;
    }
  }

  if (isDbConnected) {
    try {
      const res = await pool.query(
        `UPDATE user_reports 
         SET status = 'approved', reviewed_by = 'admin', reviewed_at = NOW() 
         WHERE cluster_id = $1 
            OR id::text = $1 
            OR ('cluster-' || SUBSTRING(id::text, 1, 8)) = $1
            OR id = ANY($2::uuid[])`,
        [clusterId, targetReportIds.length > 0 ? targetReportIds : ['00000000-0000-0000-0000-000000000000']]
      );
      count = Math.max(count, res.rowCount || 0);
    } catch (err: any) {
      console.warn('Failed to approve cluster in DB:', err.message);
    }
  }

  return count;
}

/**
 * Admin rejects an entire cluster of reports.
 */
export async function rejectCluster(clusterId: string): Promise<number> {
  const now = new Date();
  let count = 0;
  const targetReportIds: string[] = [];

  for (const r of inMemoryReports) {
    if (r.clusterId === clusterId || `cluster-${r.id.substring(0, 8)}` === clusterId) {
      r.status = 'rejected';
      r.reviewedBy = 'admin';
      r.reviewedAt = now;
      targetReportIds.push(r.id);
      count++;
    }
  }

  if (isDbConnected) {
    try {
      const res = await pool.query(
        `UPDATE user_reports 
         SET status = 'rejected', reviewed_by = 'admin', reviewed_at = NOW() 
         WHERE cluster_id = $1 
            OR id::text = $1 
            OR ('cluster-' || SUBSTRING(id::text, 1, 8)) = $1
            OR id = ANY($2::uuid[])`,
        [clusterId, targetReportIds.length > 0 ? targetReportIds : ['00000000-0000-0000-0000-000000000000']]
      );
      count = Math.max(count, res.rowCount || 0);
    } catch (err: any) {
      console.warn('Failed to reject cluster in DB:', err.message);
    }
  }

  return count;
}

/**
 * Admin takes down a published report (sets status to resolved/rejected).
 */
export async function takeDownReport(id: string): Promise<boolean> {
  const report = inMemoryReports.find((r) => r.id === id);
  const now = new Date();
  if (report) {
    report.status = 'resolved';
    report.reviewedBy = 'admin';
    report.reviewedAt = now;
  }

  if (isDbConnected) {
    try {
      await pool.query(
        `UPDATE user_reports 
         SET status = 'resolved', reviewed_by = 'admin', reviewed_at = NOW() 
         WHERE id::text = $1`,
        [id]
      );
    } catch (err: any) {
      console.warn('Failed to take down report in DB:', err.message);
      return false;
    }
  }

  return true;
}
