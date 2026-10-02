import { Router } from 'express';
import { getWeatherDashboardData } from '../services/weatherService';

export const weatherRouter = Router();

/**
 * GET /api/weather
 * Returns real-time rainfall across 4 HCMC quadrants, 24h hourly forecast timeline,
 * and calibrated vulnerable road corridors currently or soon to be at risk.
 */
weatherRouter.get('/', async (req, res) => {
  try {
    const targetDate = req.query.target_time
      ? new Date(String(req.query.target_time))
      : new Date();

    const data = await getWeatherDashboardData(targetDate);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
