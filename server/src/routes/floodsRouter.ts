import { Router } from 'express';
import { getActiveFloodEventsForTargetTime } from './routesRouter';
import { getDynamicFloodEvents } from '../db/floodsRepo';
import { getActiveReports } from '../db/reportsRepo';
import { calculateEventDepth } from '../services/predictionEngine';
import { getSaigonTideStatus } from '../services/tideService';

export const floodsRouter = Router();

floodsRouter.get('/active', async (req, res) => {
  try {
    const targetTime = req.query.target_time ? new Date(req.query.target_time as string) : new Date();
    const eventsForTime = getActiveFloodEventsForTargetTime(targetTime);
    const dynamicEvents = await getDynamicFloodEvents();
    const combined = [...eventsForTime, ...dynamicEvents];

    const activeEvents = combined.map((e) => {
      const depth = calculateEventDepth(e, targetTime);
      return { ...e, current_depth_cm: Math.round(depth) };
    });

    const reports = await getActiveReports();
    const tideStatus = getSaigonTideStatus(targetTime);

    return res.json({
      target_time: targetTime.toISOString(),
      events: activeEvents,
      reports,
      tide_status: tideStatus,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
