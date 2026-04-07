/**
 * User management tests — requires better-sqlite3 native module.
 * Runs on Linux/Docker (VPS), skips on Windows if native module isn't compiled.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';

// Skip entire file if better-sqlite3 native bindings aren't available
let usersModule;
try {
  await import('./db.js');
  usersModule = await import('./users.js');
} catch (e) {
  // Native module not available
}

const run = usersModule ? describe : describe.skip;
const { createUser, loginUser, findUserByToken, updateProfile, getAggregatedStats, listUsers, resetPassword, deleteUser } = usersModule || {};

{

  function uniqueEmail() {
    return `test-${crypto.randomBytes(8).toString('hex')}@example.com`;
  }

  // Clean up test users after each test
  function cleanupTestUsers() {
    try {
      const users = listUsers();
      for (const u of users) {
        if (u.email.includes('test-') && u.email.includes('@example.com')) {
          deleteUser(u.id);
        }
      }
    } catch (e) {}
  }

  run('createUser()', () => {
    beforeEach(cleanupTestUsers);

    it('creates a user and returns correct shape', async () => {
      const email = uniqueEmail();
      const user = await createUser('Alice', email, 'password123');

      expect(user.name).toBe('Alice');
      expect(user.email).toBe(email.toLowerCase());
      expect(user.id).toMatch(/^usr_/);
      expect(user.token).toHaveLength(64);
      expect(user.profile).toEqual({
        country: null, growType: null, experience: null,
        plantCount: null, shopPreference: null,
      });
    });

    it('trims name and lowercases email', async () => {
      const email = uniqueEmail();
      const user = await createUser('  Bob  ', email.toUpperCase(), 'pass123');
      expect(user.name).toBe('Bob');
      expect(user.email).toBe(email.toLowerCase());
    });

    it('throws EMAIL_EXISTS for duplicate email', async () => {
      const email = uniqueEmail();
      await createUser('C1', email, 'pass123');
      await expect(createUser('C2', email, 'pass456')).rejects.toThrow('EMAIL_EXISTS');
    });

    it('throws EMAIL_EXISTS case-insensitively', async () => {
      const email = uniqueEmail();
      await createUser('D1', email, 'pass123');
      await expect(createUser('D2', email.toUpperCase(), 'pass456')).rejects.toThrow('EMAIL_EXISTS');
    });
  });

  run('loginUser()', () => {
    let email, userId;
    beforeEach(async () => {
      cleanupTestUsers();
      email = uniqueEmail();
      const user = await createUser('LoginTest', email, 'securePass99');
      userId = user.id;
    });

    it('returns user data on successful login', async () => {
      const result = await loginUser(email, 'securePass99');
      expect(result.id).toBe(userId);
      expect(result.name).toBe('LoginTest');
      expect(result.token).toHaveLength(64);
    });

    it('issues new token on each login', async () => {
      const first = await loginUser(email, 'securePass99');
      const second = await loginUser(email, 'securePass99');
      expect(first.token).not.toBe(second.token);
    });

    it('throws INVALID_CREDENTIALS for wrong password', async () => {
      await expect(loginUser(email, 'wrong')).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('throws INVALID_CREDENTIALS for non-existent email', async () => {
      await expect(loginUser('nope@nope.com', 'any')).rejects.toThrow('INVALID_CREDENTIALS');
    });
  });

  run('findUserByToken()', () => {
    beforeEach(cleanupTestUsers);

    it('finds user by valid token', async () => {
      const email = uniqueEmail();
      const created = await createUser('TokenTest', email, 'pass123');
      const user = findUserByToken(created.token);
      expect(user).not.toBeNull();
      expect(user.id).toBe(created.id);
    });

    it('returns null for invalid token', () => {
      expect(findUserByToken('invalid')).toBeNull();
    });

    it('returns null for null/undefined', () => {
      expect(findUserByToken(null)).toBeNull();
      expect(findUserByToken(undefined)).toBeNull();
    });

    it('old token invalid after login', async () => {
      const email = uniqueEmail();
      const created = await createUser('Rotate', email, 'pass123');
      const login = await loginUser(email, 'pass123');
      expect(findUserByToken(created.token)).toBeNull();
      expect(findUserByToken(login.token)).not.toBeNull();
    });
  });

  run('updateProfile()', () => {
    let userId;
    beforeEach(async () => {
      cleanupTestUsers();
      const user = await createUser('ProfileTest', uniqueEmail(), 'pass123');
      userId = user.id;
    });

    it('updates allowed fields', () => {
      const profile = updateProfile(userId, { country: 'DE', growType: 'indoor' });
      expect(profile.country).toBe('DE');
      expect(profile.growType).toBe('indoor');
    });

    it('ignores disallowed fields', () => {
      const profile = updateProfile(userId, { country: 'CH', isAdmin: true, role: 'super' });
      expect(profile.country).toBe('CH');
      expect(profile.isAdmin).toBeUndefined();
    });

    it('throws USER_NOT_FOUND for bad id', () => {
      expect(() => updateProfile('usr_fake', { country: 'US' })).toThrow('USER_NOT_FOUND');
    });
  });

  run('resetPassword()', () => {
    beforeEach(cleanupTestUsers);

    it('allows login with new password', async () => {
      const email = uniqueEmail();
      const user = await createUser('ResetTest', email, 'oldPass');
      await resetPassword(user.id, 'newPass');
      const login = await loginUser(email, 'newPass');
      expect(login.id).toBe(user.id);
    });

    it('rejects old password after reset', async () => {
      const email = uniqueEmail();
      const user = await createUser('ResetOld', email, 'oldPass');
      await resetPassword(user.id, 'newPass');
      await expect(loginUser(email, 'oldPass')).rejects.toThrow('INVALID_CREDENTIALS');
    });
  });

  run('deleteUser()', () => {
    beforeEach(cleanupTestUsers);

    it('removes user completely', async () => {
      const user = await createUser('DelTest', uniqueEmail(), 'pass123');
      deleteUser(user.id);
      expect(findUserByToken(user.token)).toBeNull();
    });

    it('throws USER_NOT_FOUND for already deleted user', async () => {
      const user = await createUser('DelTwice', uniqueEmail(), 'pass123');
      deleteUser(user.id);
      expect(() => deleteUser(user.id)).toThrow('USER_NOT_FOUND');
    });
  });

  run('listUsers() + getAggregatedStats()', () => {
    beforeEach(cleanupTestUsers);

    it('lists users without password hashes', async () => {
      await createUser('ListTest', uniqueEmail(), 'pass123');
      const users = listUsers();
      const found = users.find(u => u.name === 'ListTest');
      expect(found).toBeDefined();
      expect(found.password_hash).toBeUndefined();
      expect(found.passwordHash).toBeUndefined();
    });

    it('aggregates profile stats', async () => {
      const u = await createUser('StatTest', uniqueEmail(), 'pass123');
      updateProfile(u.id, { country: 'DE' });
      const stats = getAggregatedStats();
      expect(stats.totalUsers).toBeGreaterThanOrEqual(1);
      expect(stats.profiles.country['DE']).toBeGreaterThanOrEqual(1);
    });
  });
}
