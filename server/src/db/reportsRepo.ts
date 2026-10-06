import { pool } from './pool';
import { isDbConnected } from './initDb';
import { UserReport } from '../types';

export const inMemoryReports: UserReport[] = [];

/**
 * Saves a new user flood report to PostgreSQL (or in-memory fallback).
 */
export async function saveReport(report: UserReport): Promise<UserReport> {
  inMemoryReports.unshift(report);

  if (isDbConnected) {
    try {
      await pool.query(
        `INSERT INTO user_reports 
          (id, location_geom, address_text, depth_level, depth_cm, description, image_url, upvotes, downvotes, status, reported_at)
         VALUES 
          ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
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
        ]
      );
    } catch (err: any) {
      console.warn('Failed to insert report into PostgreSQL:', err.message);
    }
  }

  return report;
}

/**
 * Fetches all active user reports from PostgreSQL (or in-memory fallback).
 */
export async function getActiveReports(): Promise<UserReport[]> {
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
          reported_at as "reportedAt"
         FROM user_reports 
         WHERE status = 'active'
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
          upvotes: r.upvotes,
          downvotes: r.downvotes,
          status: r.status,
        }));
      }
    } catch (err: any) {
      console.warn('Failed to read reports from PostgreSQL:', err.message);
    }
  }

  return inMemoryReports;
}

/**
 * Updates votes on a user report in PostgreSQL (and in-memory).
 */
export async function voteReport(id: string, type: 'upvote' | 'resolved'): Promise<UserReport | null> {
  const memReport = inMemoryReports.find((r) => r.id === id);
  if (memReport) {
    if (type === 'resolved') {
      memReport.downvotes += 1;
      if (memReport.downvotes >= 3) memReport.status = 'resolved';
    } else {
      memReport.upvotes += 1;
    }
  }

  if (isDbConnected) {
    try {
      const updateQuery = type === 'resolved'
        ? `UPDATE user_reports 
           SET downvotes = downvotes + 1, 
               status = CASE WHEN downvotes + 1 >= 3 THEN 'resolved' ELSE status END 
           WHERE id::text = $1
           RETURNING id, ST_X(location_geom) as lng, ST_Y(location_geom) as lat, depth_level as "depthLevel", depth_cm as "depthCm", description, image_url as "imageUrl", upvotes, downvotes, status, reported_at as "reportedAt"`
        : `UPDATE user_reports 
           SET upvotes = upvotes + 1 
           WHERE id::text = $1
           RETURNING id, ST_X(location_geom) as lng, ST_Y(location_geom) as lat, depth_level as "depthLevel", depth_cm as "depthCm", description, image_url as "imageUrl", upvotes, downvotes, status, reported_at as "reportedAt"`;

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
