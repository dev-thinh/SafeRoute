import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('RBAC Auth Endpoints & Access Control', () => {
  const app = createApp();

  describe('POST /api/auth/login', () => {
    it('should reject missing credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        username: 'admin',
        password: 'wrongpassword',
      });
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('không chính xác');
    });

    it('should login default admin successfully', async () => {
      const res = await request(app).post('/api/auth/login').send({
        username: 'admin',
        password: 'admin123',
      });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('admin');
      expect(res.body.user.username).toBe('admin');
    });

    it('should login default citizen/user successfully', async () => {
      const res = await request(app).post('/api/auth/login').send({
        username: 'user',
        password: 'user123',
      });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('user');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new citizen user', async () => {
      const testUsername = `testcitizen_${Date.now()}`;
      const res = await request(app).post('/api/auth/register').send({
        username: testUsername,
        password: 'password123',
        fullName: 'Nguyễn Văn Test',
      });
      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe(testUsername);
      expect(res.body.user.role).toBe('user');
    });

    it('should reject duplicate username', async () => {
      const res = await request(app).post('/api/auth/register').send({
        username: 'user',
        password: 'password123',
        fullName: 'Trùng Tên',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('đã tồn tại');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return current user when valid token is provided', async () => {
      const loginRes = await request(app).post('/api/auth/login').send({
        username: 'admin',
        password: 'admin123',
      });
      const token = loginRes.body.token;

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.user.username).toBe('admin');
      expect(meRes.body.user.role).toBe('admin');
    });
  });

  describe('RBAC Route Protection', () => {
    let userToken = '';
    let adminToken = '';

    it('prepares tokens for user and admin', async () => {
      const uRes = await request(app).post('/api/auth/login').send({
        username: 'user',
        password: 'user123',
      });
      userToken = uRes.body.token;

      const aRes = await request(app).post('/api/auth/login').send({
        username: 'admin',
        password: 'admin123',
      });
      adminToken = aRes.body.token;

      expect(userToken).toBeTruthy();
      expect(adminToken).toBeTruthy();
    });

    it('Guest: POST /api/reports should be rejected with 401', async () => {
      const res = await request(app)
        .post('/api/reports')
        .send({
          coordinate: { lat: 10.7769, lng: 106.7009 },
          depth_level: 'knee',
          description: 'Guest flood report',
        });
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('đăng nhập');
    });

    it('User: POST /api/reports succeeds with valid token', async () => {
      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          coordinate: { lat: 10.7769, lng: 106.7009 },
          depth_level: 'knee',
          description: 'User report with auth',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.report.userId).toBeDefined();
    });

    it('Admin: POST /api/reports succeeds (Admin has 100% user capabilities)', async () => {
      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          coordinate: { lat: 10.78, lng: 106.71 },
          depth_level: 'ankle',
          description: 'Admin testing reporting functionality',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('Guest: GET /api/admin/reports rejected with 401', async () => {
      const res = await request(app).get('/api/admin/reports');
      expect(res.status).toBe(401);
    });

    it('User: GET /api/admin/reports rejected with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('không có quyền quản trị');
    });

    it('Admin: GET /api/admin/reports succeeds with 200', async () => {
      const res = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.clusters).toBeInstanceOf(Array);
    });
  });
});
