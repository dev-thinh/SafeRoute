import axios from 'axios';
import { Coordinate } from '../types';
import { ENV } from '../config/env';
import { pool } from '../db/pool';
import { isDbConnected } from '../db/initDb';

// Pre-configured instant in-memory cache for major flood-prone streets in HCMC
const knownStreets: Record<string, Coordinate> = {
  'trần xuân soạn': { lat: 10.7485, lng: 106.7082 },
  'quốc hương': { lat: 10.8038, lng: 106.7326 },
  'huỳnh tấn phát': { lat: 10.7381, lng: 106.7291 },
  'lê văn lương': { lat: 10.7412, lng: 106.7011 },
  'nguyễn văn quá': { lat: 10.8415, lng: 106.6273 },
  'thảo điền': { lat: 10.8030, lng: 106.7360 },
  'nguyễn hữu cảnh': { lat: 10.7915, lng: 106.7180 },
  'phan huy ích': { lat: 10.8350, lng: 106.6340 },
  'võ văn ngân': { lat: 10.8520, lng: 106.7570 },
  'lê đức thọ': { lat: 10.8450, lng: 106.6710 },
  'nguyễn văn khối': { lat: 10.8480, lng: 106.6540 },
  'tô ngọc vân': { lat: 10.8650, lng: 106.7450 },
  'ung văn khiêm': { lat: 10.8080, lng: 106.7170 },
  'hồ học lãm': { lat: 10.7220, lng: 106.6180 },
  'an dương vương': { lat: 10.7300, lng: 106.6250 },
  'song hành quốc lộ 22': { lat: 10.8570, lng: 106.6110 },
};

/**
 * Geocodes street name and district into latitude and longitude.
 * Fast Path 1: Instant in-memory cache lookup (0ms)
 * Fast Path 2: Local PostGIS OSM road network lookup (2ms)
 * Slow Path 3: External Nominatim OSM API fallback (timeout 2500ms)
 */
export async function geocodeStreet(streetName: string, district: string): Promise<Coordinate | null> {
  const normalized = streetName.toLowerCase().trim();

  // Fast Path 1: Check known streets
  if (knownStreets[normalized]) {
    return knownStreets[normalized];
  }

  // Fast Path 2: Query local PostGIS ways table
  if (isDbConnected) {
    try {
      const res = await pool.query(
        `SELECT ST_Y(ST_Centroid(geom)) as lat, ST_X(ST_Centroid(geom)) as lng
         FROM ways
         WHERE name ILIKE $1
         LIMIT 1;`,
        [`%${streetName.trim()}%`]
      );
      if (res.rows.length > 0) {
        const found = {
          lat: parseFloat(res.rows[0].lat),
          lng: parseFloat(res.rows[0].lng),
        };
        knownStreets[normalized] = found; // memoize
        return found;
      }
    } catch {
      // Fall through to external lookup
    }
  }

  // Fast Path 3: Fallback to Nominatim OSM with short timeout
  const query = `${streetName}, ${district}, Ho Chi Minh City, Vietnam`;
  const url = `${ENV.NOMINATIM_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'SafeRoute-App/1.0' },
      timeout: 2500,
    });
    if (res.data && res.data.length > 0) {
      const found = {
        lat: parseFloat(res.data[0].lat),
        lng: parseFloat(res.data[0].lon),
      };
      knownStreets[normalized] = found;
      return found;
    }
  } catch {
    // Graceful fallback to HCMC centroid
  }

  return { lat: 10.75, lng: 106.70 };
}
