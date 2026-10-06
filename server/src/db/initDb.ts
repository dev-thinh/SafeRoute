import fs from 'fs';
import path from 'path';
import { pool } from './pool';

export let isDbConnected = false;

/**
 * Initializes database connection and verifies PostGIS schema tables.
 * Gracefully falls back to in-memory mode if PostgreSQL is not reachable.
 */
export async function initDb(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      // 1. Check if PostGIS extension is available
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
      await client.query('CREATE EXTENSION IF NOT EXISTS "postgis";');
      try {
        await client.query('CREATE EXTENSION IF NOT EXISTS "pgrouting";');
      } catch {
        // pgrouting is optional on cloud managed postgres
      }

      // 2. Apply table schemas directly (immune to tsc non-copying of .sql files)
      await client.query(`
        CREATE TABLE IF NOT EXISTS flood_events (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title VARCHAR(255) NOT NULL,
            source_url TEXT,
            source_type VARCHAR(50) NOT NULL DEFAULT 'news_crawler',
            cause VARCHAR(50) NOT NULL DEFAULT 'high_tide',
            street_name VARCHAR(255) NOT NULL,
            district VARCHAR(100) NOT NULL,
            city VARCHAR(100) NOT NULL DEFAULT 'TP. Hồ Chí Minh',
            location_geom GEOMETRY(Geometry, 4326) NOT NULL,
            buffer_geom GEOMETRY(Polygon, 4326),
            start_time TIMESTAMPTZ NOT NULL,
            peak_time TIMESTAMPTZ NOT NULL,
            end_time TIMESTAMPTZ NOT NULL,
            estimated_depth_cm INTEGER NOT NULL,
            confidence_score REAL NOT NULL DEFAULT 1.0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_flood_events_geom ON flood_events USING GIST(location_geom);
        CREATE INDEX IF NOT EXISTS idx_flood_events_buffer ON flood_events USING GIST(buffer_geom);
        CREATE INDEX IF NOT EXISTS idx_flood_events_time ON flood_events(start_time, end_time);

        CREATE TABLE IF NOT EXISTS user_reports (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            location_geom GEOMETRY(Point, 4326) NOT NULL,
            address_text VARCHAR(255),
            depth_level VARCHAR(20) NOT NULL,
            depth_cm INTEGER NOT NULL,
            description TEXT,
            image_url TEXT,
            upvotes INTEGER NOT NULL DEFAULT 1,
            downvotes INTEGER NOT NULL DEFAULT 0,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ai_confidence REAL,
            ai_reasoning TEXT,
            cluster_id VARCHAR(100),
            is_auto_approved BOOLEAN NOT NULL DEFAULT FALSE,
            reviewed_by VARCHAR(50),
            reviewed_at TIMESTAMPTZ
        );

        ALTER TABLE user_reports ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE user_reports ADD COLUMN IF NOT EXISTS ai_confidence REAL;
        ALTER TABLE user_reports ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;
        ALTER TABLE user_reports ADD COLUMN IF NOT EXISTS cluster_id VARCHAR(100);
        ALTER TABLE user_reports ADD COLUMN IF NOT EXISTS is_auto_approved BOOLEAN DEFAULT FALSE;
        ALTER TABLE user_reports ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(50);
        ALTER TABLE user_reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_user_reports_geom ON user_reports USING GIST(location_geom);
        CREATE INDEX IF NOT EXISTS idx_user_reports_cluster ON user_reports(cluster_id);
        CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);

        CREATE TABLE IF NOT EXISTS news_articles (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            url TEXT UNIQUE NOT NULL,
            title VARCHAR(500) NOT NULL,
            content TEXT NOT NULL,
            published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            is_parsed BOOLEAN NOT NULL DEFAULT FALSE,
            raw_ai_response JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      isDbConnected = true;
      console.log('🐘 [Database] PostgreSQL & PostGIS connected and schema initialized.');
      return true;
    } finally {
      client.release();
    }
  } catch (error: any) {
    isDbConnected = false;
    console.warn(`⚠️ [Database] PostgreSQL connection failed (${error.message}). Falling back to in-memory storage.`);
    return false;
  }
}
