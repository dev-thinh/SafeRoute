import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('SafeRoute REST API', () => {
  const app = createApp();

  it('GET /api/health should return ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/routes/navigate should calculate safe and fastest route', async () => {
    const res = await request(app)
      .post('/api/routes/navigate')
      .send({
        origin: { lat: 10.762, lng: 106.682 },
        destination: { lat: 10.730, lng: 106.707 },
        target_time: new Date().toISOString(),
        vehicle_type: 'motorbike',
      });

    expect(res.status).toBe(200);
    expect(res.body.safe_route).toBeDefined();
    expect(res.body.fastest_route).toBeDefined();
    expect(res.body.safe_route.geometry).toBeDefined();
    expect(res.body.precipitation_by_quadrant).toBeDefined();
    expect(res.body.tide_status).toBeDefined();
    expect(res.body.tide_status.lunarDay).toBeGreaterThanOrEqual(1);
    expect(res.body.risk_summary).toBeDefined();
    expect(typeof res.body.risk_summary.critical_count).toBe('number');
    expect(typeof res.body.risk_summary.potential_count).toBe('number');
  }, 15000);

  it('POST /api/reports should accept crowdsourced flood report and allow voting', async () => {
    const res = await request(app)
      .post('/api/reports')
      .send({
        coordinate: { lat: 10.748, lng: 106.708 },
        depth_level: 'wheel',
        description: 'Nước ngập nửa bánh xe đoạn trước chợ',
      });

    expect(res.status).toBe(201);
    expect(res.body.report.id).toBeDefined();
    expect(res.body.report.depthLevel).toBe('wheel');

    const reportId = res.body.report.id;
    // UUID v4 format regex
    expect(reportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    // Test upvote (now upvotes = 2, downvotes = 0)
    const voteRes = await request(app)
      .post(`/api/reports/${reportId}/vote`)
      .send({ type: 'upvote' });

    expect(voteRes.status).toBe(200);
    expect(voteRes.body.report.upvotes).toBe(2);
    expect(voteRes.body.report.status).toBe('active');

    // Test 1st resolved vote (upvotes = 2, downvotes = 1, total = 3, 1/3 = 33% < 60% => status remains 'active')
    const resolvedRes1 = await request(app)
      .post(`/api/reports/${reportId}/vote`)
      .send({ type: 'resolved' });

    expect(resolvedRes1.status).toBe(200);
    expect(resolvedRes1.body.report.downvotes).toBe(1);
    expect(resolvedRes1.body.report.status).toBe('active');

    // Test 2nd resolved vote (upvotes = 2, downvotes = 2, total = 4, 2/4 = 50% < 60% => status remains 'active')
    const resolvedRes2 = await request(app)
      .post(`/api/reports/${reportId}/vote`)
      .send({ type: 'resolved' });

    expect(resolvedRes2.status).toBe(200);
    expect(resolvedRes2.body.report.downvotes).toBe(2);
    expect(resolvedRes2.body.report.status).toBe('active');

    // Test 3rd resolved vote (upvotes = 2, downvotes = 3, total = 5, 3/5 = 60% >= 60% => auto-resolved!)
    const resolvedRes3 = await request(app)
      .post(`/api/reports/${reportId}/vote`)
      .send({ type: 'resolved' });

    expect(resolvedRes3.status).toBe(200);
    expect(resolvedRes3.body.report.downvotes).toBe(3);
    expect(resolvedRes3.body.report.status).toBe('resolved');
  });

  it('GET /api/reports and /api/floods/active should enforce 3h TTL and sliding window auto-extend', async () => {
    // 1. Create a fresh report at current time
    const createRes = await request(app)
      .post('/api/reports')
      .send({
        coordinate: { lat: 10.755, lng: 106.690 },
        depth_level: 'knee',
        description: 'Ngập sâu ngã tư Trần Hưng Đạo',
      });
    expect(createRes.status).toBe(201);
    const reportId = createRes.body.report.id;

    // 2. Query at current time -> report must be present
    const nowRes = await request(app).get('/api/reports');
    expect(nowRes.status).toBe(200);
    const foundNow = nowRes.body.reports.find((r: any) => r.id === reportId);
    expect(foundNow).toBeDefined();

    // 3. Query 4 hours in the future -> report should be expired (TTL > 3 hours)
    const future4h = new Date(Date.now() + 4 * 3600 * 1000).toISOString();
    const expiredRes = await request(app).get(`/api/reports?target_time=${future4h}`);
    expect(expiredRes.status).toBe(200);
    const foundExpired = expiredRes.body.reports.find((r: any) => r.id === reportId);
    expect(foundExpired).toBeUndefined();

    // 4. Upvote report to trigger sliding window auto-extend
    const upvoteRes = await request(app)
      .post(`/api/reports/${reportId}/vote`)
      .send({ type: 'upvote' });
    expect(upvoteRes.status).toBe(200);
    expect(upvoteRes.body.report.lastVerifiedAt).toBeDefined();

    // 5. Query 2 hours into the future -> report is alive because it was re-verified
    const future2h = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    const aliveRes = await request(app).get(`/api/reports?target_time=${future2h}`);
    expect(aliveRes.status).toBe(200);
    const foundAlive = aliveRes.body.reports.find((r: any) => r.id === reportId);
    expect(foundAlive).toBeDefined();

    // 6. Query 13 hours into the future -> exceeds max 12h lifetime -> must not appear
    const future13h = new Date(Date.now() + 13 * 3600 * 1000).toISOString();
    const maxLifeRes = await request(app).get(`/api/reports?target_time=${future13h}`);
    expect(maxLifeRes.status).toBe(200);
    const foundMax = maxLifeRes.body.reports.find((r: any) => r.id === reportId);
    expect(foundMax).toBeUndefined();
  });

  it('GET /api/weather should return dashboard weather data and corridors at risk', async () => {
    const res = await request(app).get('/api/weather');
    expect(res.status).toBe(200);
    expect(res.body.quadrants).toBeInstanceOf(Array);
    expect(res.body.quadrants.length).toBe(4);
    expect(res.body.quadrants.find((q: any) => q.id === 'center')).toBeDefined();
    expect(res.body.hourlyTimeline).toBeInstanceOf(Array);
    expect(res.body.corridorsAtRisk).toBeInstanceOf(Array);
  }, 10000);
});
