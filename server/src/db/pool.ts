import pg from 'pg';
import { ENV } from '../config/env';

export const pool = new pg.Pool({
  connectionString: ENV.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});
