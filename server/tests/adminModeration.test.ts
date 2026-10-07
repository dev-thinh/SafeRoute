import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { generateToken } from '../src/db/usersRepo';

describe('Role-Based Flood Reporting & Admin Moderation', () => {
  const app = createApp();

  const userToken = generateToken({
    id: 'user_citizen_001',
    username: 'user',
    fullName: 'Người dân TP.HCM',
    role: 'user',
    createdAt: new Date().toISOString(),
  });

  const adminToken = generateToken({
    id: 'user_admin_001',
    username: 'admin',
    fullName: 'Quản trị viên SafeRoute',
    role: 'admin',
    createdAt: new Date().toISOString(),
  });

  it('Public: POST /api/reports should save report as pending and quarantine it from public map', async () => {
    // 1. Submit a report
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
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
    const adminRes = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.clusters).toBeInstanceOf(Array);
    const cluster = adminRes.body.clusters.find((c: any) =>
      c.reports.some((r: any) => r.id === reportId)
    );
    expect(cluster).toBeDefined();
    expect(cluster.status).toBe('pending');
    expect(cluster.totalReports).toBeGreaterThanOrEqual(1);

    // 4. Admin manually approves the report
    const approveRes = await request(app)
      .post(`/api/admin/reports/${reportId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.report.status).toBe('approved');
    expect(approveRes.body.report.reviewedBy).toBe('admin');

    // 5. Now it MUST appear in the public active reports
    const publicAfterApprove = await request(app).get('/api/reports');
    const foundApproved = publicAfterApprove.body.reports.find((r: any) => r.id === reportId);
    expect(foundApproved).toBeDefined();
    expect(foundApproved.status).toBe('approved');

    // 6. Admin takes down the report
    const takedownRes = await request(app)
      .post(`/api/admin/reports/${reportId}/takedown`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(takedownRes.status).toBe(200);
    expect(takedownRes.body.success).toBe(true);

    // 7. Should be gone from public reports
    const publicAfterTakedown = await request(app).get('/api/reports');
    const foundTakedown = publicAfterTakedown.body.reports.find((r: any) => r.id === reportId);
    expect(foundTakedown).toBeUndefined();
  });

  it('Admin Settings: GET & POST /api/admin/settings should allow toggling Auto-Pilot', async () => {
    const getRes = await request(app)
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.settings.minClusterCountForAutoApprove).toBe(5);

    const postRes = await request(app)
      .post('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isAutoPilotEnabled: false, autoApproveThreshold: 0.90 });

    expect(postRes.status).toBe(200);
    expect(postRes.body.settings.isAutoPilotEnabled).toBe(false);
    expect(postRes.body.settings.autoApproveThreshold).toBe(0.90);

    // Reset back
    await request(app)
      .post('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isAutoPilotEnabled: true, autoApproveThreshold: 0.85, minClusterCountForAutoApprove: 5 });
  });

  it('Cluster Moderation: Admin should be able to approve or reject whole cluster', async () => {
    // Submit 2 reports at same location from 2 different users
    const r1 = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-client-token', 'user-cluster-1')
      .send({
        coordinate: { lat: 10.735, lng: 106.720 },
        depth_level: 'wheel',
        description: 'Ngập nửa bánh xe đoạn gần chợ Tân Mỹ',
      });
    const r2 = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-client-token', 'user-cluster-2')
      .send({
        coordinate: { lat: 10.7351, lng: 106.7201 },
        depth_level: 'wheel',
        description: 'Đoạn chợ Tân Mỹ ngập nước',
      });

    const clusterId = r1.body.report.clusterId;
    expect(r2.body.report.clusterId).toBe(clusterId);

    // Approve entire cluster
    const approveClusterRes = await request(app)
      .post(`/api/admin/clusters/${clusterId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approveClusterRes.status).toBe(200);
    expect(approveClusterRes.body.approvedCount).toBeGreaterThanOrEqual(2);

    // Reject entire cluster
    const rejectClusterRes = await request(app)
      .post(`/api/admin/clusters/${clusterId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(rejectClusterRes.status).toBe(200);
    expect(rejectClusterRes.body.rejectedCount).toBeGreaterThanOrEqual(2);
  });

  it('Anti-Spam VETO: Should detect single spam reports ("123", "asd", "test") and cap credibility at 5%', async () => {
    // 1. Numbers only spam
    const numRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-client-token', 'single-spam-1')
      .send({
        coordinate: { lat: 10.740, lng: 106.710 },
        depth_level: 'knee',
        description: '123',
      });
    expect(numRes.status).toBe(201);
    expect(numRes.body.report.status).toBe('pending');
    expect(numRes.body.report.aiConfidence).toBe(0.05);
    expect(numRes.body.report.aiReasoning).toContain('CẢNH BÁO SPAM');
    expect(numRes.body.report.aiReasoning).toContain('chữ số vô nghĩa');

    // 2. Keyboard mash spam
    const mashRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-client-token', 'single-spam-2')
      .send({
        coordinate: { lat: 10.741, lng: 106.711 },
        depth_level: 'knee',
        description: 'asd',
      });
    expect(mashRes.status).toBe(201);
    expect(mashRes.body.report.status).toBe('pending');
    expect(mashRes.body.report.aiConfidence).toBe(0.05);
    expect(mashRes.body.report.aiReasoning).toContain('CẢNH BÁO SPAM');
  });

  it('Spam Defense: 8 spam reports ("123", "asd", etc.) must NOT boost cluster score to 69% and must be flagged as spam cluster (5%)', async () => {
    const spamTexts = ['123', 'asd', 'asdf', '12345', '...', 'test', 'qwe', 'zxc'];
    const spamCoords = { lat: 10.7555, lng: 106.6999 };
    let targetClusterId = '';

    for (let i = 0; i < spamTexts.length; i++) {
      const text = spamTexts[i];
      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-client-token', `spam-bot-net-${i}`)
        .send({
          coordinate: spamCoords,
          depth_level: 'knee',
          description: text,
        });
      expect(res.status).toBe(201);
      expect(res.body.report.status).toBe('pending');
      expect(res.body.report.aiConfidence).toBe(0.05);
      expect(res.body.report.isAutoApproved).toBe(false);
      targetClusterId = res.body.report.clusterId;
    }

    // Verify admin cluster view
    const adminRes = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    const spamCluster = adminRes.body.clusters.find((c: any) => c.clusterId === targetClusterId);
    expect(spamCluster).toBeDefined();
    expect(spamCluster.totalReports).toBe(8);
    // Cluster confidence must NOT be 69%! It must be capped at 5% (0.05)
    expect(spamCluster.aiConfidence).toBe(0.05);
    expect(spamCluster.canAutoApprove).toBe(false);
    expect(spamCluster.status).toBe('pending');
    expect(spamCluster.aiReasoning).toContain('Cụm nghi vấn spam');

    // Verify public map still has 0 reports from this spam attack
    const publicRes = await request(app).get('/api/reports');
    expect(publicRes.status).toBe(200);
    const leakedReport = publicRes.body.reports.find((r: any) => r.clusterId === targetClusterId);
    expect(leakedReport).toBeUndefined();
  });

  it('Anti-Spam Rate Limiting: Same client cannot report the same location (within 150m) twice', async () => {
    const clientToken = 'test-client-unique-123';
    const loc = { lat: 10.770, lng: 106.690 };

    // 1st submission -> Allowed
    const res1 = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-client-token', clientToken)
      .send({
        coordinate: loc,
        depth_level: 'knee',
        description: 'Ngập sâu trước cổng viện',
      });
    expect(res1.status).toBe(201);

    // 2nd submission at same location from same client -> Blocked with 429
    const res2 = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-client-token', clientToken)
      .send({
        coordinate: { lat: 10.7702, lng: 106.6901 }, // ~25m away
        depth_level: 'deep',
        description: 'Vẫn ngập sâu',
      });
    expect(res2.status).toBe(429);
    expect(res2.body.error).toContain('Bạn đã gửi báo cáo ngập tại khu vực này rồi');
  });

  it('Spatial Merging: 2 nearby reports within 150m from different users must merge into 1 cluster', async () => {
    // 2 reports ~50m apart from 2 different users
    const r1 = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-client-token', 'user-alpha-001')
      .send({
        coordinate: { lat: 10.7800, lng: 106.6800 },
        depth_level: 'wheel',
        description: 'Ngập nửa bánh xe đoạn ngã tư',
      });
    expect(r1.status).toBe(201);

    const r2 = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-client-token', 'user-beta-002')
      .send({
        coordinate: { lat: 10.7803, lng: 106.6802 }, // ~40m away
        depth_level: 'wheel',
        description: 'Nước dâng cao đoạn ngã tư',
      });
    expect(r2.status).toBe(201);

    const adminRes = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);

    // Find the merged cluster containing these reports
    const mergedCluster = adminRes.body.clusters.find((c: any) =>
      c.reports.some((rep: any) => rep.id === r1.body.report.id)
    );
    expect(mergedCluster).toBeDefined();
    // Must be merged into 1 cluster containing both reports
    expect(mergedCluster.reports.some((rep: any) => rep.id === r2.body.report.id)).toBe(true);
    expect(mergedCluster.totalReports).toBeGreaterThanOrEqual(2);
  });

  it('Spatial Merging: 3 reports at user coordinates (10.7605, 106.6806), (10.7592, 106.6849), (10.7626, 106.6823) must merge into 1 cluster', async () => {
    const r1 = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-client-token', 'user-p1-test')
      .send({
        coordinate: { lat: 10.7605, lng: 106.6806 },
        depth_level: 'knee',
        description: 'Đoạn này ngập sâu qua đầu gối',
      });
    expect(r1.status).toBe(201);

    const r2 = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-client-token', 'user-p2-test')
      .send({
        coordinate: { lat: 10.7592, lng: 106.6849 },
        depth_level: 'wheel',
        description: 'Đoạn gần đó nước ngập nửa bánh xe',
      });
    expect(r2.status).toBe(201);

    const r3 = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-client-token', 'user-p3-test')
      .send({
        coordinate: { lat: 10.7626, lng: 106.6823 },
        depth_level: 'knee',
        description: 'Nước dâng cao xe máy không qua được',
      });
    expect(r3.status).toBe(201);

    const adminRes = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);

    // Find the cluster containing r1
    const mergedCluster = adminRes.body.clusters.find((c: any) =>
      c.reports.some((rep: any) => rep.id === r1.body.report.id)
    );
    expect(mergedCluster).toBeDefined();

    // Verify all 3 reports are merged into this single cluster
    expect(mergedCluster.reports.some((rep: any) => rep.id === r2.body.report.id)).toBe(true);
    expect(mergedCluster.reports.some((rep: any) => rep.id === r3.body.report.id)).toBe(true);
    expect(mergedCluster.totalReports).toBeGreaterThanOrEqual(3);
  });

  it('Admin Complete Rejection: Rejecting the last cluster must remove it completely from pending', async () => {
    // Submit 1 report at isolated location
    const isolatedReport = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-client-token', 'user-gamma-999')
      .send({
        coordinate: { lat: 10.8200, lng: 106.6200 },
        depth_level: 'knee',
        description: 'Đường Nguyễn Văn Quá ngập pô',
      });
    expect(isolatedReport.status).toBe(201);
    const clusterId = isolatedReport.body.report.clusterId;

    // Reject this cluster
    const rejectRes = await request(app)
      .post(`/api/admin/clusters/${clusterId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(rejectRes.status).toBe(200);

    // Verify it is completely purged from admin pending view
    const adminRes = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);
    const foundCluster = adminRes.body.clusters.find((c: any) => c.clusterId === clusterId);
    expect(foundCluster).toBeUndefined();
  });

  it('Admin Instant Dispatch: Admin reporting should be immediately approved, marked as official, and published to public map', async () => {
    // 1. Admin submits an emergency official report
    const adminReportRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        coordinate: { lat: 10.7950, lng: 106.7219 },
        depth_level: 'deep',
        description: 'Cảnh báo khẩn cấp: Ngập sâu > 60cm khu vực chân cầu Sài Gòn, xe máy không thể lưu thông',
      });

    expect(adminReportRes.status).toBe(201);
    expect(adminReportRes.body.success).toBe(true);
    expect(adminReportRes.body.message).toContain('Đã phát cảnh báo ngập chính thức');
    expect(adminReportRes.body.report.status).toBe('approved');
    expect(adminReportRes.body.report.isOfficial).toBe(true);
    expect(adminReportRes.body.report.authorRole).toBe('admin');
    expect(adminReportRes.body.report.reviewedBy).toBe('admin');
    expect(adminReportRes.body.report.aiConfidence).toBe(1.0);

    const officialReportId = adminReportRes.body.report.id;

    // 2. Report MUST appear IMMEDIATELY on the public active reports map (without manual admin approval)
    const publicMapRes = await request(app).get('/api/reports');
    expect(publicMapRes.status).toBe(200);
    const foundOnPublic = publicMapRes.body.reports.find((r: any) => r.id === officialReportId);
    expect(foundOnPublic).toBeDefined();
    expect(foundOnPublic.status).toBe('approved');
    expect(foundOnPublic.isOfficial).toBe(true);
    expect(foundOnPublic.authorRole).toBe('admin');
  });
});
