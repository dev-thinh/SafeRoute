import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const user = process.env.POSTGRES_USER || 'postgres';
  const password = process.env.POSTGRES_PASSWORD || 'postgres';
  const db = process.env.POSTGRES_DB || 'saferoute';
  return `postgresql://${user}:${password}@${host}:${port}/${db}`;
}

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  DATABASE_URL: resolveDatabaseUrl(),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GROQ_MODEL: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  GROQ_BASE_URL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
  OSRM_URL: process.env.OSRM_URL || 'https://router.project-osrm.org',
  NOMINATIM_URL: process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org',
  GOONG_API_KEY: process.env.GOONG_API_KEY || '',
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
};

export const VEHICLE_THRESHOLDS = {
  motorbike: {
    safe: 15,
    warning: 20,
    avoid: 20,
  },
  car: {
    safe: 25,
    warning: 35,
    avoid: 35,
  },
};
