import { Router } from 'express';
import { navigateSafeRoute } from '../services/routingEngine';
import { findPgRoutingSafeRoute } from '../services/pgRoutingService';
import { VehicleType, FloodEvent } from '../types';
import { inMemoryReports } from './reportsRouter';

export const routesRouter = Router();

import { inMemoryFloodEvents, getDynamicFloodEvents } from '../db/floodsRepo';
import { getActiveReports } from '../db/reportsRepo';
import { isDbConnected } from '../db/initDb';
import { getAllQuadrantsRollingPrecipitation, RollingPrecipitation } from '../services/weatherService';
import { evaluateMultiSourceHotspots } from '../services/vulnerableRoads';
import { getActiveNewsFloodEvents } from '../services/newsCrawler';
import { getSaigonTideStatus } from '../services/tideService';
export { inMemoryFloodEvents };

/**
 * Dynamically computes active and potential flood events across HCMC
 * based on real-time/forecast rolling precipitation and astronomical lunar tide.
 * Replaces the legacy hardcoded 10-point static array.
 */
export async function getActiveFloodEventsForTargetTime(
  targetDate: Date,
  includeAllCorridors: boolean = false
): Promise<FloodEvent[]> {
  try {
    const rollingPrecip = await getAllQuadrantsRollingPrecipitation(targetDate);
    return evaluateMultiSourceHotspots(targetDate, rollingPrecip, includeAllCorridors);
  } catch (err) {
    console.warn('Failed to calculate dynamic flood events:', err);
    return [];
  }
}

routesRouter.post('/navigate', async (req, res) => {
  try {
    const { origin, destination, target_time, vehicle_type } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination coordinates are required' });
    }

    const targetDate = target_time ? new Date(target_time) : new Date();
    const vehicle: VehicleType = vehicle_type === 'car' ? 'car' : 'motorbike';

    // 1. Astronomical lunar tide status
    const tideStatus = getSaigonTideStatus(targetDate);

    // 2. Real-time meteorological rainfall observation & 3h rolling accumulation
    let rainPrecipitation: Record<string, number> = { center: 0, south: 0, east: 0, northwest: 0 };
    let predictiveHotspots: FloodEvent[] = [];
    try {
      const rollingPrecip = await getAllQuadrantsRollingPrecipitation(targetDate);
      rainPrecipitation = {
        center: rollingPrecip.center.currentMm,
        south: rollingPrecip.south.currentMm,
        east: rollingPrecip.east.currentMm,
        northwest: rollingPrecip.northwest.currentMm,
      };
      // For routing, return active and potential hazards (depth >= 10cm)
      predictiveHotspots = evaluateMultiSourceHotspots(targetDate, rollingPrecip, false);
    } catch (weatherErr) {
      console.warn('Weather service query failed:', weatherErr);
    }

    // 3. Active news events (applying 3-hour temporal decay for incident reports, advance scheduling for forecasts)
    const dynamicAdminEvents = await getDynamicFloodEvents();
    const activeNewsEvents = getActiveNewsFloodEvents(dynamicAdminEvents, targetDate);

    // 4. Live crowdsourced user reports converted to flood hazard obstacles
    const activeReports = await getActiveReports(targetDate);
    const crowdsourcedEvents: FloodEvent[] = activeReports
      .filter((r) => r.status === 'active')
      .map((r) => ({
        id: r.id,
        title: `Cộng đồng báo ngập: ${r.description || 'Hiện trường'}`,
        sourceType: 'admin_manual',
        cause: 'combined',
        streetName: 'Vị trí báo cáo cộng đồng',
        district: 'TP.HCM',
        city: 'TP. Hồ Chí Minh',
        startTime: new Date(r.reportedAt.getTime() - 1800000),
        peakTime: r.reportedAt,
        endTime: new Date(r.reportedAt.getTime() + 7200000), // active for 2 hours
        estimatedDepthCm: r.depthCm,
        confidenceScore: Math.min(1.0, 0.6 + 0.1 * r.upvotes - 0.2 * r.downvotes),
        geometry: { type: 'Point', coordinates: [r.coordinate.lng, r.coordinate.lat] },
      }));

    // Combined multi-source events: 100% dynamic predictive + news + reports
    const combinedEvents = [
      ...predictiveHotspots,
      ...activeNewsEvents,
      ...crowdsourcedEvents,
    ];

    // Compute risk summary metrics
    const criticalEvents = combinedEvents.filter(
      (e) => e.estimatedDepthCm >= (vehicle === 'car' ? 35 : 20) || e.title.includes('Ngập sâu') || e.title.includes('🚨')
    );
    const potentialEvents = combinedEvents.filter(
      (e) => !criticalEvents.includes(e) && (e.estimatedDepthCm >= 10 || e.title.includes('Có khả năng ngập') || e.title.includes('⚠️'))
    );

    // 1. Prioritize native pgRouting engine on local PostGIS (100% natural Dijkstra flood avoidance)
    let result = null;
    if (isDbConnected) {
      try {
        result = await findPgRoutingSafeRoute(origin, destination, targetDate, vehicle, combinedEvents);
      } catch (pgErr) {
        console.warn('pgRouting query failed, falling back to external engine:', pgErr);
      }
    }

    // 2. If outside Saigon OSM network or disconnected graph, fall back to Goong API engine
    if (!result) {
      result = await navigateSafeRoute(origin, destination, targetDate, vehicle, combinedEvents);
    }

    return res.json({
      safe_route: result.safeRoute,
      fastest_route: result.fastestRoute,
      target_time: targetDate.toISOString(),
      vehicle_type: vehicle,
      precipitation_by_quadrant: rainPrecipitation,
      tide_status: tideStatus,
      risk_summary: {
        critical_count: criticalEvents.length,
        potential_count: potentialEvents.length,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

