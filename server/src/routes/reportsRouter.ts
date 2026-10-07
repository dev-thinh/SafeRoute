import { Router } from 'express';
import { randomUUID } from 'crypto';
import { UserReport } from '../types';
import { saveReport, getActiveReports, voteReport, inMemoryReports, checkClientSpamLimits } from '../db/reportsRepo';
import { requireAuth, AuthenticatedRequest } from '../services/authMiddleware';

export const reportsRouter = Router();
export { inMemoryReports };

const depthLevelToCm: Record<string, number> = {
  ankle: 15,
  wheel: 30,
  knee: 50,
  deep: 70,
};

reportsRouter.get('/', async (req, res) => {
  try {
    const targetTime = req.query.target_time ? new Date(req.query.target_time as string) : new Date();
    const reports = await getActiveReports(targetTime);
    return res.json({ reports });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

reportsRouter.post('/', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { coordinate, depth_level, description, image_url } = req.body;
  if (!coordinate || !depth_level) {
    return res.status(400).json({ error: 'Coordinate and depth_level are required' });
  }

  // Rate limiting & spam detection per client identifier
  const clientIdentifier =
    (req.headers['x-client-token'] as string) ||
    req.body.clientToken ||
    authReq.user?.id ||
    req.ip ||
    'anonymous';

  const limitCheck = checkClientSpamLimits(clientIdentifier, coordinate);
  if (!limitCheck.allowed) {
    return res.status(429).json({
      error: limitCheck.message || 'Bạn đã gửi báo cáo ngập tại khu vực này rồi.',
    });
  }

  const report: UserReport = {
    id: randomUUID(),
    coordinate,
    depthLevel: depth_level,
    depthCm: depthLevelToCm[depth_level] || 25,
    description,
    imageUrl: image_url,
    reportedAt: new Date(),
    upvotes: 1,
    downvotes: 0,
    status: 'pending',
    userId: authReq.user?.id,
    authorName: authReq.user?.fullName || authReq.user?.username,
  };

  const saved = await saveReport(report);
  return res.status(201).json({
    success: true,
    message: 'Đã tiếp nhận báo cáo của bạn. Thông tin đã được chuyển đến ban điều phối để kiểm duyệt.',
    report: saved,
  });
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
