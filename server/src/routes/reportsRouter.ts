import { Router } from 'express';
import { UserReport } from '../types';

export const reportsRouter = Router();
export const inMemoryReports: UserReport[] = [];

const depthLevelToCm: Record<string, number> = {
  ankle: 15,
  wheel: 30,
  knee: 50,
  deep: 70,
};

reportsRouter.post('/', (req, res) => {
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

  inMemoryReports.unshift(report);
  return res.status(201).json({ report });
});

reportsRouter.post('/:id/vote', (req, res) => {
  const { id } = req.params;
  const { type } = req.body; // 'upvote' | 'resolved'
  const report = inMemoryReports.find((r) => r.id === id);

  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  if (type === 'resolved') {
    report.downvotes += 1;
    if (report.downvotes >= 3) {
      report.status = 'resolved';
    }
  } else {
    report.upvotes += 1;
  }

  return res.json({ report });
});
