import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../db/usersRepo';
import { AuthUser } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const user = verifyToken(token);
    if (user) {
      (req as AuthenticatedRequest).user = user;
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Vui lòng đăng nhập để gửi báo cáo ngập lụt.',
      code: 'UNAUTHENTICATED',
    });
  }

  const token = authHeader.slice(7).trim();
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({
      error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.',
      code: 'INVALID_TOKEN',
    });
  }

  (req as AuthenticatedRequest).user = user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Vui lòng đăng nhập bằng tài khoản quản trị viên.',
      code: 'UNAUTHENTICATED',
    });
  }

  const token = authHeader.slice(7).trim();
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({
      error: 'Phiên đăng nhập không hợp lệ.',
      code: 'INVALID_TOKEN',
    });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({
      error: 'Bạn không có quyền quản trị để thực hiện thao tác này.',
      code: 'FORBIDDEN',
    });
  }

  (req as AuthenticatedRequest).user = user;
  next();
}
