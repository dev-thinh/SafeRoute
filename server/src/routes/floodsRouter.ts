import { Router } from 'express';
import { getDynamicFloodEvents } from '../db/floodsRepo';
import { getActiveReports } from '../db/reportsRepo';
import { calculateEventDepth } from '../services/predictionEngine';
import { getSaigonTideStatus } from '../services/tideService';
import { getAllQuadrantsRollingPrecipitation } from '../services/weatherService';
import { evaluateMultiSourceHotspots } from '../services/vulnerableRoads';
import { getActiveNewsFloodEvents } from '../services/newsCrawler';

export const floodsRouter = Router();

floodsRouter.get('/active', async (req, res) => {
  try {
    const targetTime = req.query.target_time ? new Date(req.query.target_time as string) : new Date();

    // 1. Dynamic multi-source flood hotspots evaluated across all 68 calibrated HCMC corridors (live depths, 0 if dry)
    let predictiveEvents: any[] = [];
    let rollingPrecip: any = null;
    try {
      rollingPrecip = await getAllQuadrantsRollingPrecipitation(targetTime);
      predictiveEvents = evaluateMultiSourceHotspots(targetTime, rollingPrecip, true);
    } catch (weatherErr) {
      console.warn('Weather service failed in floodsRouter:', weatherErr);
    }

    // 2. Active news events (respecting 3-hour decay for incidents, advance window for forecasts)
    const dynamicAdminEvents = await getDynamicFloodEvents();
    const activeNewsEvents = getActiveNewsFloodEvents(dynamicAdminEvents, targetTime);
    const combined = [...predictiveEvents, ...activeNewsEvents];

    const activeEvents = combined.map((e) => {
      const depth = calculateEventDepth(e, targetTime);
      return { ...e, current_depth_cm: Math.round(depth) };
    });

    const reports = await getActiveReports(targetTime);
    const tideStatus = getSaigonTideStatus(targetTime);

    return res.json({
      target_time: targetTime.toISOString(),
      events: activeEvents,
      reports,
      tide_status: tideStatus,
      precipitation_by_quadrant: rollingPrecip ? {
        center: rollingPrecip.center.currentMm,
        south: rollingPrecip.south.currentMm,
        east: rollingPrecip.east.currentMm,
        northwest: rollingPrecip.northwest.currentMm,
      } : undefined,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
