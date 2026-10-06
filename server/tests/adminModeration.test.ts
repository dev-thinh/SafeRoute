import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Role-Based Flood Reporting & Admin Moderation', () => {
  const app = createApp();

  it('Public: POST /api/reports should save report as pending and quarantine it from public map', async () => {
    // 1. Submit a report
    const res = await request(app)
      .post('/api/reports')
      .send({
        coordinate: { lat: 10.748, lng: 106.708 },
        depth_level: 'knee',
        description: 'Nước ngập sâu trước cổng trường tiểu học',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Đã tiếp nhận báo cáo');
    expect(res.body.report).toBeDefined();
    expect(res.body.report.status).toBe('pending');
    expect(res.body.report.aiConfidence).toBeDefined();
    expect(res.body.report.clusterId).toBeDefined();

    const reportId = res.body.report.id;

    // 2. Public active reports endpoint must NOT return this pending report
    const publicRes = await request(app).get('/api/reports');
    expect(publicRes.status).toBe(200);
    const foundInPublic = publicRes.body.reports.find((r: any) => r.id === reportId);
    expect(foundInPublic).toBeUndefined();

    // 3. Admin endpoint must see this report inside its cluster
    const adminRes = await request(app).get('/api/admin/reports');
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.clusters).toBeInstanceOf(Array);
    const cluster = adminRes.body.clusters.find((c: any) =>
      c.reports.some((r: any) => r.id === reportId)
    );
    expect(cluster).toBeDefined();
    expect(cluster.status).toBe('pending');
    expect(cluster.totalReports).toBeGreaterThanOrEqual(1);

    // 4. Admin manually approves the report
    const approveRes = await request(app).post(`/api/admin/reports/${reportId}/approve`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.report.status).toBe('approved');
    expect(approveRes.body.report.reviewedBy).toBe('admin');

    // 5. Now it MUST appear in the public active reports
    const publicAfterApprove = await request(app).get('/api/reports');
    const foundApproved = publicAfterApprove.body.reports.find((r: any) => r.id === reportId);
    expect(foundApproved).toBeDefined();
    expect(foundApproved.status).toBe('approved');

    // 6. Admin takes down the report
    const takedownRes = await request(app).post(`/api/admin/reports/${reportId}/takedown`);
    expect(takedownRes.status).toBe(200);
    expect(takedownRes.body.success).toBe(true);

    // 7. Should be gone from public reports
    const publicAfterTakedown = await request(app).get('/api/reports');
    const foundTakedown = publicAfterTakedown.body.reports.find((r: any) => r.id === reportId);
    expect(foundTakedown).toBeUndefined();
  });

  it('Admin Settings: GET & POST /api/admin/settings should allow toggling Auto-Pilot', async () => {
    const getRes = await request(app).get('/api/admin/settings');
    expect(getRes.status).toBe(200);
    expect(getRes.body.settings.minClusterCountForAutoApprove).toBe(5);

    const postRes = await request(app)
      .post('/api/admin/settings')
      .send({ isAutoPilotEnabled: false, autoApproveThreshold: 0.90 });

    expect(postRes.status).toBe(200);
    expect(postRes.body.settings.isAutoPilotEnabled).toBe(false);
    expect(postRes.body.settings.autoApproveThreshold).toBe(0.90);

    // Reset back
    await request(app)
      .post('/api/admin/settings')
      .send({ isAutoPilotEnabled: true, autoApproveThreshold: 0.85, minClusterCountForAutoApprove: 5 });
  });

  it('Cluster Moderation: Admin should be able to approve or reject whole cluster', async () => {
    // Submit 2 reports at same location
    const r1 = await request(app).post('/api/reports').send({
      coordinate: { lat: 10.735, lng: 106.720 },
      depth_level: 'wheel',
      description: 'Ngập nửa bánh xe đoạn gần chợ Tân Mỹ',
    });
    const r2 = await request(app).post('/api/reports').send({
      coordinate: { lat: 10.7351, lng: 106.7201 },
      depth_level: 'wheel',
      description: 'Đoạn chợ Tân Mỹ ngập nước',
    });

    const clusterId = r1.body.report.clusterId;
    expect(r2.body.report.clusterId).toBe(clusterId);

    // Approve entire cluster
    const approveClusterRes = await request(app).post(`/api/admin/clusters/${clusterId}/approve`);
    expect(approveClusterRes.status).toBe(200);
    expect(approveClusterRes.body.approvedCount).toBeGreaterThanOrEqual(2);

    // Reject entire cluster
    const rejectClusterRes = await request(app).post(`/api/admin/clusters/${clusterId}/reject`);
    expect(rejectClusterRes.status).toBe(200);
    expect(rejectClusterRes.body.rejectedCount).toBeGreaterThanOrEqual(2);
  });
});
