import { Router } from 'express';
import { inMemoryFloodEvents } from './routesRouter';
import { inMemoryReports } from './reportsRouter';
import { calculateTidalDepth, calculateRainDepth } from '../services/predictionEngine';

export const floodsRouter = Router();

floodsRouter.get('/active', (req, res) => {
  const targetTime = req.query.target_time ? new Date(req.query.target_time as string) : new Date();

  const activeEvents = inMemoryFloodEvents.map((e) => {
    const depth = e.cause === 'high_tide' ? calculateTidalDepth(e, targetTime) : calculateRainDepth(e, targetTime);
    return { ...e, current_depth_cm: Math.round(depth) };
  });

  return res.json({
    target_time: targetTime.toISOString(),
    events: activeEvents,
    reports: inMemoryReports,
  });
});
