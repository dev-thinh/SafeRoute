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

    // Test upvote
    const voteRes = await request(app)
      .post(`/api/reports/${reportId}/vote`)
      .send({ type: 'upvote' });

    expect(voteRes.status).toBe(200);
    expect(voteRes.body.report.upvotes).toBe(2);

    // Test resolved vote
    const resolvedRes = await request(app)
      .post(`/api/reports/${reportId}/vote`)
      .send({ type: 'resolved' });

    expect(resolvedRes.status).toBe(200);
    expect(resolvedRes.body.report.downvotes).toBe(1);
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
