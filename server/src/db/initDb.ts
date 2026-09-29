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

      // 2. Read and apply schema.sql
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schemaSql);
      }

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
