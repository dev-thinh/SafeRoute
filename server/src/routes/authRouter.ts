import { Router } from 'express';
import {
  createUser,
  findUserByUsername,
  verifyPassword,
  generateToken,
} from '../db/usersRepo';
import { requireAuth, AuthenticatedRequest } from '../services/authMiddleware';

export const authRouter = Router();

/**
 * POST /api/auth/register
 * Body: { username, password, fullName }
 */
authRouter.post('/register', async (req, res) => {
  try {
    const { username, password, fullName } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        error: 'Vui lòng cung cấp đầy đủ tên đăng nhập và mật khẩu.',
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        error: 'Tên đăng nhập phải có ít nhất 3 ký tự.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Mật khẩu phải có ít nhất 6 ký tự.',
      });
    }

    const newUser = await createUser({
      username,
      password,
      fullName: fullName || username,
      role: 'user', // Public registrations are always role: user
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      token,
      user: newUser,
    });
  } catch (err: any) {
    return res.status(400).json({
      error: err.message || 'Đăng ký tài khoản không thành công.',
    });
  }
});

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        error: 'Vui lòng nhập tên đăng nhập và mật khẩu.',
      });
    }

    const userRecord = await findUserByUsername(username);
    if (!userRecord) {
      return res.status(401).json({
        error: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
      });
    }

    const isValid = verifyPassword(password, userRecord.passwordHash, userRecord.salt);
    if (!isValid) {
      return res.status(401).json({
        error: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
      });
    }

    const authUser = {
      id: userRecord.id,
      username: userRecord.username,
      fullName: userRecord.fullName,
      role: userRecord.role,
      createdAt: userRecord.createdAt,
    };

    const token = generateToken(authUser);

    return res.json({
      success: true,
      token,
      user: authUser,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message || 'Lỗi hệ thống khi đăng nhập.',
    });
  }
});

/**
 * GET /api/auth/me
 * Protected endpoint returning current user profile
 */
authRouter.get('/me', requireAuth, (req, res) => {
  const authReq = req as AuthenticatedRequest;
  return res.json({
    user: authReq.user,
  });
});
