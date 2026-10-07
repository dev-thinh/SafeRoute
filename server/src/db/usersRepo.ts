import crypto, { randomUUID, pbkdf2Sync, randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { AuthUser, UserRecord, UserRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'saferoute_secure_jwt_secret_token_2026';

function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computedHash = hashPassword(password, salt);
  try {
    return timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

// In-memory store backed by Map
let usersByUsername = new Map<string, UserRecord>();
let usersById = new Map<string, UserRecord>();

function seedDefaultUsers() {
  usersByUsername.clear();
  usersById.clear();

  // 1. Default Admin Account
  const adminSalt = randomBytes(16).toString('hex');
  const adminHash = hashPassword('admin123', adminSalt);
  const adminUser: UserRecord = {
    id: 'user_admin_001',
    username: 'admin',
    fullName: 'Quản trị viên SafeRoute',
    role: 'admin',
    passwordHash: adminHash,
    salt: adminSalt,
    createdAt: new Date().toISOString(),
  };
  usersByUsername.set('admin', adminUser);
  usersById.set(adminUser.id, adminUser);

  // 2. Default Citizen/User Account
  const citizenSalt = randomBytes(16).toString('hex');
  const citizenHash = hashPassword('user123', citizenSalt);
  const citizenUser: UserRecord = {
    id: 'user_citizen_001',
    username: 'user',
    fullName: 'Người dân TP.HCM',
    role: 'user',
    passwordHash: citizenHash,
    salt: citizenSalt,
    createdAt: new Date().toISOString(),
  };
  usersByUsername.set('user', citizenUser);
  usersById.set(citizenUser.id, citizenUser);
}

// Initial seed
seedDefaultUsers();

export async function resetUsersStore(): Promise<void> {
  seedDefaultUsers();
}

export async function createUser(data: {
  username: string;
  password: string;
  fullName: string;
  role?: UserRole;
}): Promise<AuthUser> {
  const normalizedUsername = data.username.trim().toLowerCase();
  if (usersByUsername.has(normalizedUsername)) {
    throw new Error('Tên đăng nhập đã tồn tại');
  }

  const salt = randomBytes(16).toString('hex');
  const passwordHash = hashPassword(data.password, salt);

  const newUser: UserRecord = {
    id: `user_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
    username: normalizedUsername,
    fullName: data.fullName.trim() || normalizedUsername,
    role: data.role || 'user',
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
  };

  usersByUsername.set(normalizedUsername, newUser);
  usersById.set(newUser.id, newUser);

  return {
    id: newUser.id,
    username: newUser.username,
    fullName: newUser.fullName,
    role: newUser.role,
    createdAt: newUser.createdAt,
  };
}

export async function findUserByUsername(
  username: string
): Promise<UserRecord | null> {
  const normalized = username.trim().toLowerCase();
  return usersByUsername.get(normalized) || null;
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  const user = usersById.get(id);
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    createdAt: user.createdAt,
  };
}

// Lightweight, zero-dependency signed JWT generator and validator
export function generateToken(user: AuthUser): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    })
  ).toString('base64url');

  const signature = createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token: string): AuthUser | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSignature = createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return {
      id: decoded.sub,
      username: decoded.username,
      fullName: decoded.fullName,
      role: decoded.role,
      createdAt: new Date(decoded.iat * 1000).toISOString(),
    };
  } catch {
    return null;
  }
}
