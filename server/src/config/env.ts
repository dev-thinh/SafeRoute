import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/saferoute',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
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
