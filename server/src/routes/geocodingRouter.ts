import { Router } from 'express';
import axios from 'axios';
import { ENV } from '../config/env';

export const geocodingRouter = Router();

const HCMC_CENTER = { lat: 10.7725, lng: 106.6980 };

const HCMC_FALLBACK_PRESETS = [
  { label: 'ĐH Khoa Học Tự Nhiên (227 Nguyễn Văn Cừ, Q5)', lat: 10.7626, lng: 106.6823 },
  { label: 'Chợ Bến Thành (Quận 1)', lat: 10.7725, lng: 106.6980 },
  { label: 'KĐT Phú Mỹ Hưng (Quận 7)', lat: 10.7303, lng: 106.7075 },
  { label: 'Đường Trần Xuân Soạn (Quận 7)', lat: 10.7485, lng: 106.7082 },
  { label: 'Landmark 81 (Bình Thạnh)', lat: 10.7950, lng: 106.7219 },
  { label: 'Thảo Điền (TP. Thủ Đức - Đường Quốc Hương)', lat: 10.8038, lng: 106.7326 },
  { label: 'Sân bay Tân Sơn Nhất (Tân Bình)', lat: 10.8185, lng: 106.6588 },
  { label: 'ĐH Bách Khoa (268 Lý Thường Kiệt, Q10)', lat: 10.7722, lng: 106.6578 },
  { label: 'Hồ Con Rùa (Quận 3)', lat: 10.7828, lng: 106.6958 },
  { label: 'Đường Huỳnh Tấn Phát (Quận 7 / Nhà Bè)', lat: 10.7381, lng: 106.7291 },
  { label: 'Đường Nguyễn Văn Quá (Quận 12)', lat: 10.8415, lng: 106.6273 },
];

function getEuclideanDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = lat1 - lat2;
  const dLon = lon1 - lon2;
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

/**
 * Searches via Goong Map API (Vietnam's leading Grab/Shopee-grade address geocoder)
 */
async function searchGoong(query: string, apiKey: string) {
  try {
    const acUrl = `https://rsapi.goong.io/Place/AutoComplete?api_key=${apiKey}&input=${encodeURIComponent(query)}&location=${HCMC_CENTER.lat},${HCMC_CENTER.lng}&limit=5`;
    const acRes = await axios.get(acUrl, { timeout: 4000 });
    const predictions = acRes.data?.predictions || [];
    const results: { label: string; lat: number; lng: number }[] = [];

    // Fetch details for top 3 predictions in parallel
    const detailPromises = predictions.slice(0, 3).map(async (pred: any) => {
      try {
        const detailUrl = `https://rsapi.goong.io/Place/Detail?place_id=${pred.place_id}&api_key=${apiKey}`;
        const dRes = await axios.get(detailUrl, { timeout: 3000 });
        const loc = dRes.data?.result?.geometry?.location;
        if (loc && loc.lat && loc.lng) {
          return {
            label: pred.description || pred.structured_formatting?.main_text,
            lat: loc.lat,
            lng: loc.lng,
          };
        }
      } catch (err) {
        return null;
      }
      return null;
    });

    const resolved = await Promise.all(detailPromises);
    for (const r of resolved) {
      if (r) results.push(r);
    }
    return results;
  } catch (err: any) {
    console.warn('Goong search error:', err.message);
    return [];
  }
}

/**
 * Searches via Google Maps Geocoding API
 */
async function searchGoogle(query: string, apiKey: string) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query + ', Hồ Chí Minh, Việt Nam')}&components=country:VN&key=${apiKey}`;
    const res = await axios.get(url, { timeout: 4000 });
    const results: { label: string; lat: number; lng: number }[] = [];
    for (const item of res.data?.results || []) {
      results.push({
        label: item.formatted_address,
        lat: item.geometry.location.lat,
        lng: item.geometry.location.lng,
      });
    }
    return results;
  } catch (err: any) {
    console.warn('Google Maps geocode error:', err.message);
    return [];
  }
}

/**
 * GET /api/geocoding/search?q=...
 * Multi-layer accurate geocoding:
 * 1. Coordinates direct match (lat, lng)
 * 2. Goong API (if GOONG_API_KEY configured)
 * 3. Google Maps API (if GOOGLE_MAPS_API_KEY configured)
 * 4. Open-source Hybrid:
 *    a. Photon API (Preserves exact house numbers & POIs, biased to HCMC)
 *    b. Nominatim bounded search with addressdetails + House Number segment sorting
 *    c. Presets fallback
 */
geocodingRouter.get('/search', async (req, res) => {
  const query = (req.query.q as string || '').trim();
  if (!query) {
    return res.json({ results: HCMC_FALLBACK_PRESETS.slice(0, 5) });
  }

  // 1. Direct coordinate format (e.g. "10.7626, 106.6823")
  const coordMatch = query.match(/^([0-9\.\-]+)[,\s]+([0-9\.\-]+)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= 8 && lat <= 12 && lng >= 104 && lng <= 108) {
      return res.json({
        results: [{ label: `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng }],
      });
    }
  }

  // 2. Goong Map API (Vietnam-specific, exact house number & hẻm mapping)
  if (ENV.GOONG_API_KEY) {
    const goongResults = await searchGoong(query, ENV.GOONG_API_KEY);
    if (goongResults.length > 0) {
      return res.json({ results: goongResults });
    }
  }

  // 3. Google Maps API
  if (ENV.GOOGLE_MAPS_API_KEY) {
    const googleResults = await searchGoogle(query, ENV.GOOGLE_MAPS_API_KEY);
    if (googleResults.length > 0) {
      return res.json({ results: googleResults });
    }
  }

  // 4. Open-source Hybrid Search (Photon + Nominatim with intelligent house number sorting)
  const results: { label: string; lat: number; lng: number }[] = [];

  // Match presets first
  const matchedPresets = HCMC_FALLBACK_PRESETS.filter((p) =>
    p.label.toLowerCase().includes(query.toLowerCase())
  );
  results.push(...matchedPresets);

  // Extract house number if present (e.g. "45" in "45 Huỳnh Tấn Phát" or "227" in "227 Nguyễn Văn Cừ")
  const houseMatch = query.match(/^([0-9]+[A-Za-z0-9\/\-\.]*)/);
  const houseNum = houseMatch ? parseInt(houseMatch[1], 10) : null;

  // 4a. Query Photon API (preserves house numbers, buildings, shops, and alley names)
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=${HCMC_CENTER.lat}&lon=${HCMC_CENTER.lng}&limit=6`;
    const photonRes = await axios.get(photonUrl, { timeout: 4000 });
    if (photonRes.data && photonRes.data.features) {
      for (const f of photonRes.data.features) {
        const lat = f.geometry.coordinates[1];
        const lng = f.geometry.coordinates[0];
        // Bounding box filter for greater HCMC region (lat 10.3 to 11.2, lon 106.3 to 107.1)
        if (lat >= 10.3 && lat <= 11.2 && lng >= 106.3 && lng <= 107.1) {
          const p = f.properties;
          const labelParts = [
            p.housenumber,
            p.name && p.name !== p.street ? p.name : null,
            p.street || (!p.name ? 'Đường' : null),
            p.district || p.locality,
            p.city || 'TP.HCM',
          ].filter(Boolean);

          results.push({
            label: labelParts.join(', '),
            lat,
            lng,
          });
        }
      }
    }
  } catch (err: any) {
    console.warn('Photon geocoding error:', err.message);
  }

  // 4b. Query Nominatim with HCMC bounding box & addressdetails
  try {
    const searchUrl = `${ENV.NOMINATIM_URL}/search?q=${encodeURIComponent(query)}&viewbox=106.35,11.15,107.05,10.35&bounded=1&format=json&addressdetails=1&countrycodes=vn&limit=8`;
    const nomRes = await axios.get(searchUrl, {
      headers: { 'User-Agent': 'SafeRoute-App/1.0 (contact@saferoute.vn)' },
      timeout: 5000,
    });

    if (nomRes.data && nomRes.data.length > 0) {
      const items = [...nomRes.data];

      // Sort road segments based on house number relative to city origin
      // In HCMC, smaller house numbers (< 300) are near the urban center/start of the street;
      // larger numbers (> 700) are near suburban outskirts/end of the street.
      if (houseNum !== null && items.length > 1) {
        items.sort((a, b) => {
          const distA = getEuclideanDistance(parseFloat(a.lat), parseFloat(a.lon), HCMC_CENTER.lat, HCMC_CENTER.lng);
          const distB = getEuclideanDistance(parseFloat(b.lat), parseFloat(b.lon), HCMC_CENTER.lat, HCMC_CENTER.lng);
          return houseNum < 300 ? distA - distB : distB - distA;
        });
      }

      for (const item of items) {
        const addr = item.address || {};
        const street = addr.road || addr.pedestrian || query;
        const ward = addr.suburb || addr.quarter || addr.neighbourhood || '';
        const district = addr.city_district || addr.district || '';
        
        // Compute distance hint along the road
        const distKm = getEuclideanDistance(parseFloat(item.lat), parseFloat(item.lon), HCMC_CENTER.lat, HCMC_CENTER.lng) * 111;
        let hint = '';
        if (distKm < 5.5) hint = '(Đoạn gần trung tâm/đầu đường)';
        else if (distKm > 10.5) hint = '(Đoạn ngoại thành/cuối đường)';

        const prefix = houseMatch && !street.includes(houseMatch[0]) ? `${houseMatch[0]} ` : '';
        const label = [
          `${prefix}${street}`,
          ward,
          district,
          hint,
        ].filter(Boolean).join(', ');

        results.push({
          label,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        });
      }
    }
  } catch (err: any) {
    console.warn('Nominatim geocoding error:', err.message);
  }

  // De-duplicate by coordinate proximity (< 100 meters)
  const uniqueResults: { label: string; lat: number; lng: number }[] = [];
  for (const item of results) {
    const isDuplicate = uniqueResults.some(
      (u) => Math.abs(u.lat - item.lat) < 0.0008 && Math.abs(u.lng - item.lng) < 0.0008
    );
    if (!isDuplicate) {
      uniqueResults.push(item);
    }
  }

  return res.json({ results: uniqueResults.slice(0, 8) });
});

/**
 * GET /api/geocoding/reverse?lat=...&lng=...
 * Reverse geocodes coordinates to a human-readable address.
 */
geocodingRouter.get('/reverse', async (req, res) => {
  const lat = req.query.lat as string;
  const lng = req.query.lng as string;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng parameters are required' });
  }

  // Goong Reverse Geocode if key configured
  if (ENV.GOONG_API_KEY) {
    try {
      const gUrl = `https://rsapi.goong.io/Geocode?latlng=${lat},${lng}&api_key=${ENV.GOONG_API_KEY}`;
      const gRes = await axios.get(gUrl, { timeout: 3000 });
      if (gRes.data?.results && gRes.data.results.length > 0) {
        return res.json({
          label: gRes.data.results[0].formatted_address,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
        });
      }
    } catch (err: any) {
      console.warn('Goong reverse geocode error:', err.message);
    }
  }

  try {
    const reverseUrl = `${ENV.NOMINATIM_URL}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const response = await axios.get(reverseUrl, {
      headers: { 'User-Agent': 'SafeRoute-App/1.0 (contact@saferoute.vn)' },
      timeout: 5000,
    });

    if (response.data && response.data.display_name) {
      const addr = response.data.address || {};
      const house = addr.house_number || '';
      const road = addr.road || addr.pedestrian || '';
      const ward = addr.suburb || addr.quarter || addr.neighbourhood || '';
      const district = addr.city_district || addr.district || '';

      if (road) {
        const cleanParts = [house ? `${house} ${road}` : road, ward, district, 'TP.HCM'].filter(Boolean);
        return res.json({ label: cleanParts.join(', '), lat: parseFloat(lat), lng: parseFloat(lng) });
      }

      // Shorten display name to the first 3 segments
      const cleanLabel = response.data.display_name.split(',').slice(0, 3).join(', ');
      return res.json({ label: cleanLabel, lat: parseFloat(lat), lng: parseFloat(lng) });
    }
  } catch (err: any) {
    console.warn('Reverse geocoding error:', err.message);
  }

  return res.json({
    label: `Tọa độ: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
  });
});
