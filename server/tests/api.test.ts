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
  }, 15000);

  it('POST /api/reports should accept crowdsourced flood report', async () => {
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
  });
});
