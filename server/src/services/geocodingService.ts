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
  'nguyễn gia trí': { lat: 10.8035, lng: 106.7145 },
  'd2': { lat: 10.8035, lng: 106.7145 },
  'đinh bộ lĩnh': { lat: 10.8070, lng: 106.7090 },
  'bạch đằng': { lat: 10.8020, lng: 106.7020 },
  'kha vạn cân': { lat: 10.8520, lng: 106.7450 },
  'đỗ xuân hợp': { lat: 10.8120, lng: 106.7780 },
  'phạm văn chiêu': { lat: 10.8530, lng: 106.6500 },
  'lê văn thọ': { lat: 10.8460, lng: 106.6580 },
  'hồ học lãm': { lat: 10.7220, lng: 106.6180 },
  'an dương vương': { lat: 10.7300, lng: 106.6250 },
  'song hành quốc lộ 22': { lat: 10.8570, lng: 106.6110 },
  'phạm hùng': { lat: 10.7380, lng: 106.6750 },
  'dương bá trạc': { lat: 10.7489, lng: 106.6883 },
  'bến phú định': { lat: 10.7250, lng: 106.6280 },
  'mễ cốc': { lat: 10.7225, lng: 106.6255 },
  'bà triệu': { lat: 10.8783, lng: 106.5920 },
  'linh đông': { lat: 10.8526, lng: 106.7486 },
  'tăng nhơn phú': { lat: 10.8350, lng: 106.7750 },
  'phan văn hớn': { lat: 10.8450, lng: 106.6180 },
  'phan anh': { lat: 10.7680, lng: 106.6220 },
  'quang trung': { lat: 10.8265, lng: 106.6799 },
  'tên lửa': { lat: 10.7567, lng: 106.5901 },
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
    // Geocoding lookup failed
  }

  return null;
}
