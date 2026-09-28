import axios from 'axios';
import { Coordinate } from '../types';
import { ENV } from '../config/env';

/**
 * Geocodes street name and district into latitude and longitude via OSM Nominatim.
 */
export async function geocodeStreet(streetName: string, district: string): Promise<Coordinate | null> {
  const query = `${streetName}, ${district}, Ho Chi Minh City, Vietnam`;
  const url = `${ENV.NOMINATIM_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'SafeRoute-App/1.0' },
      timeout: 5000,
    });
    if (res.data && res.data.length > 0) {
      return {
        lat: parseFloat(res.data[0].lat),
        lng: parseFloat(res.data[0].lon),
      };
    }
  } catch (err) {
    console.warn(`Geocoding failed for ${streetName}:`, err);
  }

  // Pre-configured coordinates for iconic flood-prone streets in HCMC
  const knownStreets: Record<string, Coordinate> = {
    'trần xuân soạn': { lat: 10.7485, lng: 106.7082 },
    'quốc hương': { lat: 10.8038, lng: 106.7326 },
    'huỳnh tấn phát': { lat: 10.7381, lng: 106.7291 },
    'lê văn lương': { lat: 10.7412, lng: 106.7011 },
    'nguyễn văn quá': { lat: 10.8415, lng: 106.6273 },
    'thảo điền': { lat: 10.8030, lng: 106.7360 },
    'nguyễn hữu cảnh': { lat: 10.7915, lng: 106.7180 },
  };

  const normalized = streetName.toLowerCase().trim();
  return knownStreets[normalized] || { lat: 10.75, lng: 106.70 };
}
