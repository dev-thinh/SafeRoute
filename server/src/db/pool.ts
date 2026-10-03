import pg from 'pg';
import { ENV } from '../config/env';

const isCloudDb =
  !ENV.DATABASE_URL.includes('localhost') &&
  !ENV.DATABASE_URL.includes('127.0.0.1') &&
  !ENV.DATABASE_URL.includes('postgres:5432');

export const pool = new pg.Pool({
  connectionString: ENV.DATABASE_URL,
  ssl: isCloudDb ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});
