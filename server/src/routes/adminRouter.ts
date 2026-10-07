import { Router } from 'express';
import {
  getAdminReportClusters,
  approveReport,
  rejectReport,
  approveCluster,
  rejectCluster,
  takeDownReport,
  getAdminSettings,
  updateAdminSettings,
} from '../db/reportsRepo';
import { requireAdmin } from '../services/authMiddleware';

export const adminRouter = Router();

// Protect all admin endpoints with requireAdmin
adminRouter.use(requireAdmin);

/**
 * GET /api/admin/reports
 * Fetches all report clusters grouped by spatial-temporal window.
 */
adminRouter.get('/reports', async (_req, res) => {
  try {
    const clusters = await getAdminReportClusters();
    const totalPending = clusters.filter((c) => c.status === 'pending').length;
    const totalApproved = clusters.filter((c) => c.status === 'approved').length;
    const totalReports = clusters.reduce((sum, c) => sum + c.totalReports, 0);

    return res.json({
      clusters,
      summary: {
        totalClusters: clusters.length,
        totalPending,
        totalApproved,
        totalReports,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/reports/:id/approve
 * Manually approves a single user report.
 */
adminRouter.post('/reports/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const report = await approveReport(id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    return res.json({ success: true, report });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/reports/:id/reject
 * Manually rejects a single user report.
 */
adminRouter.post('/reports/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const report = await rejectReport(id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    return res.json({ success: true, report });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/clusters/:clusterId/approve
 * Manually approves all reports in a cluster.
 */
adminRouter.post('/clusters/:clusterId/approve', async (req, res) => {
  try {
    const { clusterId } = req.params;
    const count = await approveCluster(clusterId);
    return res.json({ success: true, approvedCount: count });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/clusters/:clusterId/reject
 * Manually rejects all reports in a cluster.
 */
adminRouter.post('/clusters/:clusterId/reject', async (req, res) => {
  try {
    const { clusterId } = req.params;
    const count = await rejectCluster(clusterId);
    return res.json({ success: true, rejectedCount: count });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/reports/:id/takedown
 * Takes down a published flood report from the public map.
 */
adminRouter.post('/reports/:id/takedown', async (req, res) => {
  try {
    const { id } = req.params;
    const ok = await takeDownReport(id);
    return res.json({ success: ok });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/settings
 */
adminRouter.get('/settings', (_req, res) => {
  return res.json({ settings: getAdminSettings() });
});

/**
 * POST /api/admin/settings
 */
adminRouter.post('/settings', (req, res) => {
  try {
    const updated = updateAdminSettings(req.body);
    return res.json({ success: true, settings: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
