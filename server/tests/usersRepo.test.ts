import { describe, it, expect, beforeEach } from 'vitest';
import {
  createUser,
  findUserByUsername,
  findUserById,
  verifyPassword,
  generateToken,
  verifyToken,
  resetUsersStore,
} from '../src/db/usersRepo';

describe('Users Repository & Crypto Tokens', () => {
  beforeEach(async () => {
    await resetUsersStore();
  });

  it('should have default seed admin and user accounts preloaded', async () => {
    const admin = await findUserByUsername('admin');
    expect(admin).toBeDefined();
    expect(admin?.role).toBe('admin');
    expect(admin?.username).toBe('admin');
    expect(verifyPassword('admin123', admin!.passwordHash, admin!.salt)).toBe(true);
    expect(verifyPassword('wrongpassword', admin!.passwordHash, admin!.salt)).toBe(false);

    const citizen = await findUserByUsername('user');
    expect(citizen).toBeDefined();
    expect(citizen?.role).toBe('user');
    expect(verifyPassword('user123', citizen!.passwordHash, citizen!.salt)).toBe(true);
  });

  it('should register a new user with hashed password and unique salt', async () => {
    const newUser = await createUser({
      username: 'nguyenvana',
      password: 'mypassword123',
      fullName: 'Nguyễn Văn A',
    });

    expect(newUser.id).toBeDefined();
    expect(newUser.username).toBe('nguyenvana');
    expect(newUser.fullName).toBe('Nguyễn Văn A');
    expect(newUser.role).toBe('user');

    const found = await findUserByUsername('nguyenvana');
    expect(found).toBeDefined();
    expect(verifyPassword('mypassword123', found!.passwordHash, found!.salt)).toBe(true);
    expect(verifyPassword('anotherpass', found!.passwordHash, found!.salt)).toBe(false);
  });

  it('should reject creating duplicate username', async () => {
    await createUser({
      username: 'duplicate_user',
      password: 'password',
      fullName: 'User Duplicate',
    });

    await expect(
      createUser({
        username: 'duplicate_user',
        password: 'password',
        fullName: 'User Duplicate 2',
      })
    ).rejects.toThrow('Tên đăng nhập đã tồn tại');
  });

  it('should generate signed token and verify it correctly', async () => {
    const user = (await findUserByUsername('admin'))!;
    const token = generateToken(user);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const verified = verifyToken(token);
    expect(verified).toBeDefined();
    expect(verified?.id).toBe(user.id);
    expect(verified?.username).toBe('admin');
    expect(verified?.role).toBe('admin');
  });

  it('should reject tampered or invalid tokens', () => {
    const verified = verifyToken('invalid.token.string');
    expect(verified).toBeNull();

    const empty = verifyToken('');
    expect(empty).toBeNull();
  });
});
