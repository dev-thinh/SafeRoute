import { Router } from 'express';
import { navigateSafeRoute } from '../services/routingEngine';
import { VehicleType, FloodEvent } from '../types';

export const routesRouter = Router();

/**
 * Returns dynamic realistic flood hotspots across HCMC aligned with targetDate's diurnal cycle.
 * In HCMC, semi-diurnal tides produce 2 peaks daily (06:00 morning & 17:45 evening rush hour).
 * Rainfall storms typically occur between 16:30 and 19:00.
 */
export function getActiveFloodEventsForTargetTime(targetDate: Date): FloodEvent[] {
  const y = targetDate.getFullYear();
  const m = targetDate.getMonth();
  const d = targetDate.getDate();

  // Morning tide peak window (04:30 -> 06:15 peak -> 08:30)
  const morningStart = new Date(y, m, d, 4, 30, 0);
  const morningPeak = new Date(y, m, d, 6, 15, 0);
  const morningEnd = new Date(y, m, d, 8, 30, 0);

  // Evening tide peak window (16:00 -> 17:45 peak -> 20:30)
  const eveningStart = new Date(y, m, d, 16, 0, 0);
  const eveningPeak = new Date(y, m, d, 17, 45, 0);
  const eveningEnd = new Date(y, m, d, 20, 30, 0);

  // Determine closest tide window to targetDate
  const isMorning =
    Math.abs(targetDate.getTime() - morningPeak.getTime()) <
    Math.abs(targetDate.getTime() - eveningPeak.getTime());
  const tideStart = isMorning ? morningStart : eveningStart;
  const tidePeak = isMorning ? morningPeak : eveningPeak;
  const tideEnd = isMorning ? morningEnd : eveningEnd;

  // Afternoon storm rain window (16:30 -> 17:30 peak -> 19:30)
  const rainStart = new Date(y, m, d, 16, 30, 0);
  const rainPeak = new Date(y, m, d, 17, 30, 0);
  const rainEnd = new Date(y, m, d, 19, 30, 0);

  return [
    {
      id: 'hcmc-flood-1',
      title: 'Triều cường đường Trần Xuân Soạn (Bờ kè kênh Tẻ)',
      sourceType: 'tide_forecast',
      cause: 'high_tide',
      streetName: 'Trần Xuân Soạn',
      district: 'Quận 7',
      city: 'TP. Hồ Chí Minh',
      startTime: tideStart,
      peakTime: tidePeak,
      endTime: tideEnd,
      estimatedDepthCm: 45,
      confidenceScore: 0.95,
      geometry: { type: 'Point', coordinates: [106.7082, 10.7485] },
    },
    {
      id: 'hcmc-flood-2',
      title: 'Ngập úng đường Nguyễn Thị Thập (Đoạn Mai Văn Vĩnh - Nguyễn Hữu Thọ)',
      sourceType: 'tide_forecast',
      cause: 'high_tide',
      streetName: 'Nguyễn Thị Thập',
      district: 'Quận 7',
      city: 'TP. Hồ Chí Minh',
      startTime: tideStart,
      peakTime: tidePeak,
      endTime: tideEnd,
      estimatedDepthCm: 40,
      confidenceScore: 0.95,
      geometry: { type: 'Point', coordinates: [106.6960, 10.7390] },
    },
    {
      id: 'hcmc-flood-3',
      title: 'Triều cường đường Dương Bá Trạc (Chân cầu Kênh Xáng)',
      sourceType: 'tide_forecast',
      cause: 'high_tide',
      streetName: 'Dương Bá Trạc',
      district: 'Quận 8',
      city: 'TP. Hồ Chí Minh',
      startTime: tideStart,
      peakTime: tidePeak,
      endTime: tideEnd,
      estimatedDepthCm: 35,
      confidenceScore: 0.92,
      geometry: { type: 'Point', coordinates: [106.6883, 10.7489] },
    },
    {
      id: 'hcmc-flood-4',
      title: 'Triều cường đường Huỳnh Tấn Phát (Đoạn Phú Thuận & Tân Thuận Đông)',
      sourceType: 'tide_forecast',
      cause: 'high_tide',
      streetName: 'Huỳnh Tấn Phát',
      district: 'Quận 7 / Nhà Bè',
      city: 'TP. Hồ Chí Minh',
      startTime: tideStart,
      peakTime: tidePeak,
      endTime: tideEnd,
      estimatedDepthCm: 50,
      confidenceScore: 0.95,
      geometry: { type: 'Point', coordinates: [106.7325, 10.7349] },
    },
    {
      id: 'hcmc-flood-5',
      title: 'Triều cường đường Lê Văn Lương (Cầu Long Kiểng / Rạch Tôm)',
      sourceType: 'tide_forecast',
      cause: 'high_tide',
      streetName: 'Lê Văn Lương',
      district: 'Quận 7 / Nhà Bè',
      city: 'TP. Hồ Chí Minh',
      startTime: tideStart,
      peakTime: tidePeak,
      endTime: tideEnd,
      estimatedDepthCm: 45,
      confidenceScore: 0.92,
      geometry: { type: 'Point', coordinates: [106.7011, 10.7412] },
    },
    {
      id: 'hcmc-flood-6',
      title: 'Triều cường sông Sài Gòn đường Quốc Hương (Thảo Điền)',
      sourceType: 'tide_forecast',
      cause: 'high_tide',
      streetName: 'Quốc Hương',
      district: 'TP. Thủ Đức',
      city: 'TP. Hồ Chí Minh',
      startTime: tideStart,
      peakTime: tidePeak,
      endTime: tideEnd,
      estimatedDepthCm: 40,
      confidenceScore: 0.95,
      geometry: { type: 'Point', coordinates: [106.7326, 10.8038] },
    },
    {
      id: 'hcmc-flood-7',
      title: 'Ngập úng đường Nguyễn Hữu Cảnh (Chân cầu Thủ Thiêm)',
      sourceType: 'news_crawler',
      cause: 'high_tide',
      streetName: 'Nguyễn Hữu Cảnh',
      district: 'Bình Thạnh',
      city: 'TP. Hồ Chí Minh',
      startTime: tideStart,
      peakTime: tidePeak,
      endTime: tideEnd,
      estimatedDepthCm: 45,
      confidenceScore: 0.90,
      geometry: { type: 'Point', coordinates: [106.7180, 10.7915] },
    },
    {
      id: 'hcmc-flood-8',
      title: 'Ngập do mưa lớn đường Nguyễn Văn Quá (Chợ Cầu)',
      sourceType: 'news_crawler',
      cause: 'heavy_rain',
      streetName: 'Nguyễn Văn Quá',
      district: 'Quận 12',
      city: 'TP. Hồ Chí Minh',
      startTime: rainStart,
      peakTime: rainPeak,
      endTime: rainEnd,
      estimatedDepthCm: 50,
      confidenceScore: 0.93,
      geometry: { type: 'Point', coordinates: [106.6273, 10.8415] },
    },
    {
      id: 'hcmc-flood-9',
      title: 'Ngập do mưa dốc đường Võ Văn Ngân & Kha Vạn Cân (Chợ Thủ Đức)',
      sourceType: 'news_crawler',
      cause: 'heavy_rain',
      streetName: 'Võ Văn Ngân',
      district: 'TP. Thủ Đức',
      city: 'TP. Hồ Chí Minh',
      startTime: rainStart,
      peakTime: rainPeak,
      endTime: rainEnd,
      estimatedDepthCm: 45,
      confidenceScore: 0.94,
      geometry: { type: 'Point', coordinates: [106.7570, 10.8520] },
    },
    {
      id: 'hcmc-flood-10',
      title: 'Triều cường kênh Đôi bến Phú Định & Hồ Học Lãm',
      sourceType: 'tide_forecast',
      cause: 'high_tide',
      streetName: 'Bến Phú Định',
      district: 'Quận 8',
      city: 'TP. Hồ Chí Minh',
      startTime: tideStart,
      peakTime: tidePeak,
      endTime: tideEnd,
      estimatedDepthCm: 45,
      confidenceScore: 0.90,
      geometry: { type: 'Point', coordinates: [106.6280, 10.7250] },
    },
  ];
}

// In-memory flood events cache for fast route processing
export const inMemoryFloodEvents: FloodEvent[] = getActiveFloodEventsForTargetTime(new Date());

routesRouter.post('/navigate', async (req, res) => {
  try {
    const { origin, destination, target_time, vehicle_type } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination coordinates are required' });
    }

    const targetDate = target_time ? new Date(target_time) : new Date();
    const vehicle: VehicleType = vehicle_type === 'car' ? 'car' : 'motorbike';

    // Dynamically retrieve active flood events for the user-selected date/time
    const eventsForTime = getActiveFloodEventsForTargetTime(targetDate);

    const result = await navigateSafeRoute(origin, destination, targetDate, vehicle, eventsForTime);

    return res.json({
      safe_route: result.safeRoute,
      fastest_route: result.fastestRoute,
      target_time: targetDate.toISOString(),
      vehicle_type: vehicle,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
