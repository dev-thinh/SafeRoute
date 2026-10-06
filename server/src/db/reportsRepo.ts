import { pool } from './pool';
import { isDbConnected } from './initDb';
import { UserReport } from '../types';

export const REPORT_BASE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
export const REPORT_MAX_LIFETIME_MS = 12 * 60 * 60 * 1000; // 12 hours

export const inMemoryReports: UserReport[] = [];

/**
 * Saves a new user flood report to PostgreSQL (or in-memory fallback).
 */
export async function saveReport(report: UserReport): Promise<UserReport> {
  if (!report.lastVerifiedAt) {
    report.lastVerifiedAt = report.reportedAt || new Date();
  }
  inMemoryReports.unshift(report);

  if (isDbConnected) {
    try {
      await pool.query(
        `INSERT INTO user_reports 
          (id, location_geom, address_text, depth_level, depth_cm, description, image_url, upvotes, downvotes, status, reported_at, last_verified_at)
         VALUES 
          ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
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
        ]
      );
    } catch (err: any) {
      console.warn('Failed to insert report into PostgreSQL:', err.message);
    }
  }

  return report;
}

/**
 * Fetches all active user reports within valid TTL (3 hours from last verification, max 12 hours total).
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
          COALESCE(last_verified_at, reported_at) as "lastVerifiedAt"
         FROM user_reports 
         WHERE status = 'active'
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
        }));
      }
      return [];
    } catch (err: any) {
      console.warn('Failed to read reports from PostgreSQL:', err.message);
    }
  }

  const refTimeMs = queryTime.getTime();
  return inMemoryReports.filter((r) => {
    if (r.status !== 'active') return false;
    const reportedTimeMs = new Date(r.reportedAt).getTime();
    const verifiedTimeMs = new Date(r.lastVerifiedAt || r.reportedAt).getTime();

    // Must not exceed max lifetime of 12 hours from initial report
    if (refTimeMs - reportedTimeMs > REPORT_MAX_LIFETIME_MS) return false;
    // Must not exceed 3 hours from last verification
    if (refTimeMs - verifiedTimeMs > REPORT_BASE_TTL_MS) return false;

    return true;
  });
}

/**
 * Updates votes on a user report in PostgreSQL (and in-memory).
 * Upvoting automatically extends the 3-hour TTL (sliding window) up to 12 hours maximum lifetime.
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
      // Sliding window auto-extend: reset 3-hour TTL from now if within max lifetime 12 hours
      if (now.getTime() - reportedTimeMs <= REPORT_MAX_LIFETIME_MS) {
        memReport.lastVerifiedAt = now;
      }
    }

    const totalVotes = memReport.upvotes + memReport.downvotes;
    // Consensus rule: minimum 3 sample votes and >= 60% votes confirm water has receded
    if (totalVotes >= 3 && (memReport.downvotes / totalVotes) >= 0.60) {
      memReport.status = 'resolved';
    } else if (memReport.status === 'resolved' && (memReport.downvotes / totalVotes) < 0.60) {
      memReport.status = 'active';
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
           RETURNING id, ST_X(location_geom) as lng, ST_Y(location_geom) as lat, depth_level as "depthLevel", depth_cm as "depthCm", description, image_url as "imageUrl", upvotes, downvotes, status, reported_at as "reportedAt", COALESCE(last_verified_at, reported_at) as "lastVerifiedAt"`
        : `UPDATE user_reports 
           SET upvotes = upvotes + 1,
               last_verified_at = CASE 
                 WHEN NOW() - reported_at <= INTERVAL '12 hours' THEN NOW() 
                 ELSE last_verified_at 
               END,
               status = CASE 
                 WHEN (upvotes + 1 + downvotes >= 3) AND (downvotes::float / (upvotes + 1 + downvotes)::float >= 0.60) 
                 THEN 'resolved' 
                 ELSE 'active' 
               END 
           WHERE id::text = $1
           RETURNING id, ST_X(location_geom) as lng, ST_Y(location_geom) as lat, depth_level as "depthLevel", depth_cm as "depthCm", description, image_url as "imageUrl", upvotes, downvotes, status, reported_at as "reportedAt", COALESCE(last_verified_at, reported_at) as "lastVerifiedAt"`;

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
