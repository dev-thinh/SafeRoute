import { Router } from 'express';
import { navigateSafeRoute } from '../services/routingEngine';
import { VehicleType, FloodEvent } from '../types';

export const routesRouter = Router();

// In-memory flood events cache for fast route processing
export const inMemoryFloodEvents: FloodEvent[] = [
  {
    id: 'sample-1',
    title: 'Triều cường đường Trần Xuân Soạn',
    sourceType: 'news_crawler',
    cause: 'high_tide',
    streetName: 'Trần Xuân Soạn',
    district: 'Quận 7',
    city: 'TP. Hồ Chí Minh',
    startTime: new Date(Date.now() - 3600000),
    peakTime: new Date(Date.now() + 3600000),
    endTime: new Date(Date.now() + 3 * 3600000),
    estimatedDepthCm: 45,
    confidenceScore: 0.95,
    geometry: { type: 'Point', coordinates: [106.7082, 10.7485] },
  },
];

routesRouter.post('/navigate', async (req, res) => {
  try {
    const { origin, destination, target_time, vehicle_type } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination coordinates are required' });
    }

    const targetDate = target_time ? new Date(target_time) : new Date();
    const vehicle: VehicleType = vehicle_type === 'car' ? 'car' : 'motorbike';

    const result = await navigateSafeRoute(origin, destination, targetDate, vehicle, inMemoryFloodEvents);

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
