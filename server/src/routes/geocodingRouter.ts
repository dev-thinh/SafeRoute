import { Router } from 'express';
import axios from 'axios';
import { ENV } from '../config/env';

export const geocodingRouter = Router();

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

/**
 * GET /api/geocoding/search?q=...
 * Searches address in Vietnam (prioritizing HCMC) with multi-level fallback:
 * 1. Exact query via Nominatim with countrycodes=vn
 * 2. Stripped house number (street + ward + district)
 * 3. Photon Komoot API
 * 4. Presets
 */
geocodingRouter.get('/search', async (req, res) => {
  const query = (req.query.q as string || '').trim();
  if (!query) {
    return res.json({ results: HCMC_FALLBACK_PRESETS.slice(0, 5) });
  }

  const results: { label: string; lat: number; lng: number }[] = [];

  // Match presets first
  const matchedPresets = HCMC_FALLBACK_PRESETS.filter((p) =>
    p.label.toLowerCase().includes(query.toLowerCase())
  );
  results.push(...matchedPresets);

  try {
    // 1. Try exact search via Nominatim
    const searchUrl = `${ENV.NOMINATIM_URL}/search?q=${encodeURIComponent(query + ', Hồ Chí Minh')}&format=json&countrycodes=vn&limit=5`;
    const nomRes = await axios.get(searchUrl, {
      headers: { 'User-Agent': 'SafeRoute-App/1.0 (contact@saferoute.vn)' },
      timeout: 5000,
    });

    if (nomRes.data && nomRes.data.length > 0) {
      for (const item of nomRes.data) {
        results.push({
          label: item.display_name.split(',').slice(0, 4).join(', '),
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        });
      }
    } else {
      // 2. Fallback: Strip house number (e.g., "123/45/6 đường Nguyễn Thị Thập" -> "Nguyễn Thị Thập")
      const stripped = query.replace(/^[0-9]+[A-Za-z0-9\/\-\.]*\s*(đường|phố)?\s*/i, '').trim();
      if (stripped && stripped !== query) {
        const fallbackUrl = `${ENV.NOMINATIM_URL}/search?q=${encodeURIComponent(stripped + ', Hồ Chí Minh')}&format=json&countrycodes=vn&limit=5`;
        const fbRes = await axios.get(fallbackUrl, {
          headers: { 'User-Agent': 'SafeRoute-App/1.0 (contact@saferoute.vn)' },
          timeout: 4000,
        });
        if (fbRes.data && fbRes.data.length > 0) {
          for (const item of fbRes.data) {
            results.push({
              label: `${query} (${item.display_name.split(',').slice(0, 3).join(', ')})`,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
            });
          }
        }
      }

      // 3. Fallback: Photon API
      if (results.length === 0) {
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=10.76&lon=106.68&limit=5`;
        const photonRes = await axios.get(photonUrl, { timeout: 4000 });
        if (photonRes.data && photonRes.data.features) {
          for (const f of photonRes.data.features) {
            const p = f.properties;
            const label = [p.name, p.street, p.district, p.city].filter(Boolean).join(', ');
            results.push({
              label: label || query,
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0],
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('Geocoding search error:', err.message);
  }

  // De-duplicate by coordinate proximity
  const uniqueResults: { label: string; lat: number; lng: number }[] = [];
  for (const item of results) {
    const isDuplicate = uniqueResults.some(
      (u) => Math.abs(u.lat - item.lat) < 0.0001 && Math.abs(u.lng - item.lng) < 0.0001
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

  try {
    const reverseUrl = `${ENV.NOMINATIM_URL}/reverse?lat=${lat}&lon=${lng}&format=json`;
    const response = await axios.get(reverseUrl, {
      headers: { 'User-Agent': 'SafeRoute-App/1.0 (contact@saferoute.vn)' },
      timeout: 5000,
    });

    if (response.data && response.data.display_name) {
      // Shorten display name to the first 3-4 segments
      const cleanLabel = response.data.display_name.split(',').slice(0, 4).join(', ');
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
