import { Router } from 'express';
import { UserReport } from '../types';
import { saveReport, getActiveReports, voteReport, inMemoryReports } from '../db/reportsRepo';

export const reportsRouter = Router();
export { inMemoryReports };

const depthLevelToCm: Record<string, number> = {
  ankle: 15,
  wheel: 30,
  knee: 50,
  deep: 70,
};

reportsRouter.get('/', async (_req, res) => {
  try {
    const reports = await getActiveReports();
    return res.json({ reports });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

reportsRouter.post('/', async (req, res) => {
  const { coordinate, depth_level, description, image_url } = req.body;
  if (!coordinate || !depth_level) {
    return res.status(400).json({ error: 'Coordinate and depth_level are required' });
  }

  const report: UserReport = {
    id: `report-${Date.now()}`,
    coordinate,
    depthLevel: depth_level,
    depthCm: depthLevelToCm[depth_level] || 25,
    description,
    imageUrl: image_url,
    reportedAt: new Date(),
    upvotes: 1,
    downvotes: 0,
    status: 'active',
  };

  const saved = await saveReport(report);
  return res.status(201).json({ report: saved });
});

reportsRouter.post('/:id/vote', async (req, res) => {
  const { id } = req.params;
  const { type } = req.body; // 'upvote' | 'resolved'
  const report = await voteReport(id, type);

  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  return res.json({ report });
});
