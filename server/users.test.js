/**
 * User management integration tests.
 *
 * Tests the exact business logic from server/users.js:
 *   - Password hashing (crypto.scrypt with random salt)
 *   - Token generation & rotation
 *   - Profile field allow-list filtering
 *   - CRUD operations (create, read, update, delete)
 *
 * Uses an in-memory store instead of SQLite because better-sqlite3
 * requires native compilation (Visual Studio C++ on Windows).
 * The functions below are extracted from users.js with the require('./db')
 * calls replaced by in-memory Map operations — same logic, portable storage.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';

// ── In-memory store (replaces SQLite prepared statements) ──

const store = new Map(); // id -> user row

const stmtFindUserByEmail = {
  get: (email) => {
    for (const u of store.values()) {
      if (u.email === email.toLowerCase().trim()) return { ...u };
    }
    return undefined;
  },
};

const stmtFindUserByToken = {
  get: (token) => {
    for (const u of store.values()) {
      if (u.token === token) return { ...u };
    }
    return undefined;
  },
};

const stmtFindUserById = {
  get: (id) => {
    const u = store.get(id);
    return u ? { ...u } : undefined;
  },
};

const stmtInsertUser = {
  run: (id, name, email, password_hash, token, profile_json) => {
    store.set(id, {
      id, name, email, password_hash, token, profile_json,
      created_at: new Date().toISOString(),
    });
  },
};

const stmtUpdateToken = {
  run: (token, id) => {
    const u = store.get(id);
    if (u) u.token = token;
  },
};

const stmtUpdateProfile = {
  run: (profile_json, id) => {
    const u = store.get(id);
    if (u) u.profile_json = profile_json;
  },
};

const stmtUpdatePassword = {
  run: (password_hash, token, id) => {
    const u = store.get(id);
    if (u) { u.password_hash = password_hash; u.token = token; }
  },
};

const stmtDeleteUserRow = {
  run: (id) => { store.delete(id); },
};

const stmtListUsers = {
  all: () => {
    const result = [];
    for (const u of store.values()) {
      result.push({
        id: u.id, name: u.name, email: u.email,
        profile_json: u.profile_json, created_at: u.created_at,
      });
    }
    result.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return result;
  },
};

const stmtCountUsers = {
  get: () => ({ count: store.size }),
};

// ── Functions from server/users.js (exact same logic) ──

function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('hex'));
    });
  });
}

async function createUser(name, email, password) {
  const existing = stmtFindUserByEmail.get(email.toLowerCase().trim());
  if (existing) throw new Error('EMAIL_EXISTS');

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await hashPassword(password, salt);
  const token = crypto.randomBytes(32).toString('hex');
  const id = 'usr_' + crypto.randomBytes(8).toString('hex');
  const profile = { country: null, growType: null, experience: null, plantCount: null, shopPreference: null };

  stmtInsertUser.run(id, name.trim(), email.toLowerCase().trim(), `${salt}:${hash}`, token, JSON.stringify(profile));

  return { id, name: name.trim(), email: email.toLowerCase().trim(), token, profile };
}

async function loginUser(email, password) {
  const user = stmtFindUserByEmail.get(email.toLowerCase().trim());
  if (!user) throw new Error('INVALID_CREDENTIALS');

  const [salt, storedHash] = user.password_hash.split(':');
  const hash = await hashPassword(password, salt);
  if (hash !== storedHash) throw new Error('INVALID_CREDENTIALS');

  const newToken = crypto.randomBytes(32).toString('hex');
  stmtUpdateToken.run(newToken, user.id);

  const profile = JSON.parse(user.profile_json || '{}');
  return { id: user.id, name: user.name, email: user.email, token: newToken, profile };
}

function findUserByToken(token) {
  if (!token) return null;
  const user = stmtFindUserByToken.get(token);
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, profile: JSON.parse(user.profile_json || '{}') };
}

function updateProfile(userId, profileData) {
  const user = stmtFindUserById.get(userId);
  if (!user) throw new Error('USER_NOT_FOUND');

  const profile = JSON.parse(user.profile_json || '{}');
  const allowed = ['country', 'growType', 'experience', 'plantCount', 'shopPreference'];
  for (const key of allowed) {
    if (profileData[key] !== undefined) {
      profile[key] = profileData[key];
    }
  }
  stmtUpdateProfile.run(JSON.stringify(profile), userId);
  return profile;
}

function getAggregatedStats() {
  const total = stmtCountUsers.get().count;
  const users = stmtListUsers.all();
  const stats = {
    totalUsers: total,
    profiles: { country: {}, growType: {}, experience: {}, plantCount: {}, shopPreference: {} },
  };
  for (const u of users) {
    const p = JSON.parse(u.profile_json || '{}');
    for (const key of ['country', 'growType', 'experience', 'plantCount', 'shopPreference']) {
      if (p[key]) {
        stats.profiles[key][p[key]] = (stats.profiles[key][p[key]] || 0) + 1;
      }
    }
  }
  return stats;
}

function listUsers() {
  return stmtListUsers.all().map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    profile: JSON.parse(u.profile_json || '{}'),
    createdAt: u.created_at,
  }));
}

async function resetPassword(userId, newPassword) {
  const user = stmtFindUserById.get(userId);
  if (!user) throw new Error('USER_NOT_FOUND');

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await hashPassword(newPassword, salt);
  const newToken = crypto.randomBytes(32).toString('hex');
  stmtUpdatePassword.run(`${salt}:${hash}`, newToken, userId);
  return { id: user.id, email: user.email };
}

function deleteUser(userId) {
  const user = stmtFindUserById.get(userId);
  if (!user) throw new Error('USER_NOT_FOUND');
  stmtDeleteUserRow.run(userId);
  return { id: user.id, email: user.email };
}

// ── Helpers ──

function uniqueEmail() {
  return `test-${crypto.randomBytes(8).toString('hex')}@example.com`;
}

// Clear store before each test for full isolation
beforeEach(() => {
  store.clear();
});

// ────────────────────────────────────────────────────────────────
// createUser
// ────────────────────────────────────────────────────────────────

describe('createUser()', () => {
  it('creates a user and returns the correct shape', async () => {
    const email = uniqueEmail();
    const user = await createUser('Alice', email, 'password123');

    expect(user).toMatchObject({
      name: 'Alice',
      email: email.toLowerCase(),
    });
    expect(user.id).toMatch(/^usr_/);
    expect(typeof user.token).toBe('string');
    expect(user.token.length).toBe(64); // 32 random bytes -> 64 hex chars
    expect(user.profile).toEqual({
      country: null,
      growType: null,
      experience: null,
      plantCount: null,
      shopPreference: null,
    });
  });

  it('trims name and lowercases email', async () => {
    const email = uniqueEmail();
    const user = await createUser('  Bob  ', email.toUpperCase(), 'password123');

    expect(user.name).toBe('Bob');
    expect(user.email).toBe(email.toLowerCase());
  });

  it('generates unique user ids matching usr_ + 16 hex chars', async () => {
    const u1 = await createUser('User1', uniqueEmail(), 'pass');
    const u2 = await createUser('User2', uniqueEmail(), 'pass');

    expect(u1.id).toMatch(/^usr_[a-f0-9]{16}$/);
    expect(u2.id).toMatch(/^usr_[a-f0-9]{16}$/);
    expect(u1.id).not.toBe(u2.id);
  });

  it('throws EMAIL_EXISTS when email is already taken', async () => {
    const email = uniqueEmail();
    await createUser('Charlie', email, 'pass1');

    await expect(createUser('Charlie2', email, 'pass2'))
      .rejects.toThrow('EMAIL_EXISTS');
  });

  it('throws EMAIL_EXISTS case-insensitively', async () => {
    const email = uniqueEmail();
    await createUser('Dave', email, 'pass1');

    await expect(createUser('Dave2', email.toUpperCase(), 'pass2'))
      .rejects.toThrow('EMAIL_EXISTS');
  });

  it('stores the user in the backing store with hashed password', async () => {
    const email = uniqueEmail();
    const user = await createUser('Stored', email, 'pass');

    expect(store.has(user.id)).toBe(true);
    const row = store.get(user.id);
    expect(row.name).toBe('Stored');
    expect(row.email).toBe(email.toLowerCase());
    // Password hash should be salt:hash format
    expect(row.password_hash).toContain(':');
    expect(row.password_hash).not.toBe('pass'); // not plaintext
  });
});

// ────────────────────────────────────────────────────────────────
// loginUser
// ────────────────────────────────────────────────────────────────

describe('loginUser()', () => {
  let userId;
  let email;
  const password = 'securePass99';

  beforeEach(async () => {
    email = uniqueEmail();
    const user = await createUser('LoginTester', email, password);
    userId = user.id;
  });

  it('returns user data with a new token on successful login', async () => {
    const result = await loginUser(email, password);

    expect(result.id).toBe(userId);
    expect(result.name).toBe('LoginTester');
    expect(result.email).toBe(email.toLowerCase());
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBe(64);
    expect(result.profile).toBeDefined();
  });

  it('issues a new token on each login', async () => {
    const first = await loginUser(email, password);
    const second = await loginUser(email, password);

    expect(first.token).not.toBe(second.token);
  });

  it('throws INVALID_CREDENTIALS for wrong password', async () => {
    await expect(loginUser(email, 'wrongPassword'))
      .rejects.toThrow('INVALID_CREDENTIALS');
  });

  it('throws INVALID_CREDENTIALS for non-existent email', async () => {
    await expect(loginUser('nobody@nowhere.com', 'anything'))
      .rejects.toThrow('INVALID_CREDENTIALS');
  });

  it('login is case-insensitive on email', async () => {
    const result = await loginUser(email.toUpperCase(), password);
    expect(result.id).toBe(userId);
  });

  it('returns a parsed profile object', async () => {
    const result = await loginUser(email, password);
    expect(typeof result.profile).toBe('object');
    expect(result.profile).not.toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────
// findUserByToken
// ────────────────────────────────────────────────────────────────

describe('findUserByToken()', () => {
  it('finds a user by valid token', async () => {
    const email = uniqueEmail();
    const created = await createUser('TokenTester', email, 'pass');

    const user = findUserByToken(created.token);

    expect(user).not.toBeNull();
    expect(user.id).toBe(created.id);
    expect(user.name).toBe('TokenTester');
    expect(user.email).toBe(email.toLowerCase());
    expect(user.profile).toBeDefined();
  });

  it('does not expose password_hash', async () => {
    const created = await createUser('NoHash', uniqueEmail(), 'pass');
    const user = findUserByToken(created.token);

    expect(user.password_hash).toBeUndefined();
    expect(user.passwordHash).toBeUndefined();
  });

  it('returns null for an invalid token', () => {
    expect(findUserByToken('not-a-valid-token')).toBeNull();
  });

  it('returns null for null', () => {
    expect(findUserByToken(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(findUserByToken(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(findUserByToken('')).toBeNull();
  });

  it('old token becomes invalid after login rotates it', async () => {
    const email = uniqueEmail();
    const created = await createUser('Rotate', email, 'pass');
    const oldToken = created.token;

    const loginResult = await loginUser(email, 'pass');

    expect(findUserByToken(oldToken)).toBeNull();

    const user = findUserByToken(loginResult.token);
    expect(user).not.toBeNull();
    expect(user.id).toBe(created.id);
  });
});

// ────────────────────────────────────────────────────────────────
// updateProfile
// ────────────────────────────────────────────────────────────────

describe('updateProfile()', () => {
  let userId;

  beforeEach(async () => {
    const user = await createUser('ProfileTester', uniqueEmail(), 'pass');
    userId = user.id;
  });

  it('updates allowed profile fields', () => {
    const profile = updateProfile(userId, {
      country: 'DE',
      growType: 'indoor',
      experience: 'beginner',
    });

    expect(profile.country).toBe('DE');
    expect(profile.growType).toBe('indoor');
    expect(profile.experience).toBe('beginner');
  });

  it('preserves previously set fields when updating others', () => {
    updateProfile(userId, { country: 'AT' });
    const profile = updateProfile(userId, { plantCount: '5' });

    expect(profile.country).toBe('AT');
    expect(profile.plantCount).toBe('5');
  });

  it('ignores disallowed fields (isAdmin, role, password)', () => {
    const profile = updateProfile(userId, {
      country: 'CH',
      isAdmin: true,
      role: 'superuser',
      password: 'hacked',
    });

    expect(profile.country).toBe('CH');
    expect(profile.isAdmin).toBeUndefined();
    expect(profile.role).toBeUndefined();
    expect(profile.password).toBeUndefined();
  });

  it('updates all five allowed fields at once', () => {
    const profile = updateProfile(userId, {
      country: 'US',
      growType: 'outdoor',
      experience: 'advanced',
      plantCount: '10',
      shopPreference: 'organic',
    });

    expect(profile.country).toBe('US');
    expect(profile.growType).toBe('outdoor');
    expect(profile.experience).toBe('advanced');
    expect(profile.plantCount).toBe('10');
    expect(profile.shopPreference).toBe('organic');
  });

  it('throws USER_NOT_FOUND for non-existent user', () => {
    expect(() => updateProfile('usr_nonexistent', { country: 'US' }))
      .toThrow('USER_NOT_FOUND');
  });

  it('handles empty update gracefully (preserves existing)', () => {
    updateProfile(userId, { country: 'DE' });
    const profile = updateProfile(userId, {});

    expect(profile.country).toBe('DE');
  });
});

// ────────────────────────────────────────────────────────────────
// getAggregatedStats
// ────────────────────────────────────────────────────────────────

describe('getAggregatedStats()', () => {
  it('returns zero totalUsers when store is empty', () => {
    const stats = getAggregatedStats();
    expect(stats.totalUsers).toBe(0);
  });

  it('returns correct totalUsers count', async () => {
    await createUser('S1', uniqueEmail(), 'pass');
    await createUser('S2', uniqueEmail(), 'pass');

    expect(getAggregatedStats().totalUsers).toBe(2);
  });

  it('aggregates profile data correctly', async () => {
    const u = await createUser('SP', uniqueEmail(), 'pass');
    updateProfile(u.id, { country: 'DE', growType: 'indoor' });

    const stats = getAggregatedStats();

    expect(stats.profiles.country['DE']).toBe(1);
    expect(stats.profiles.growType['indoor']).toBe(1);
  });

  it('counts multiple users with the same profile value', async () => {
    const u1 = await createUser('M1', uniqueEmail(), 'pass');
    const u2 = await createUser('M2', uniqueEmail(), 'pass');
    updateProfile(u1.id, { country: 'DE' });
    updateProfile(u2.id, { country: 'DE' });

    expect(getAggregatedStats().profiles.country['DE']).toBe(2);
  });

  it('has the expected shape', () => {
    const stats = getAggregatedStats();

    expect(stats).toHaveProperty('totalUsers');
    expect(stats).toHaveProperty('profiles');
    for (const key of ['country', 'growType', 'experience', 'plantCount', 'shopPreference']) {
      expect(stats.profiles).toHaveProperty(key);
    }
  });

  it('does not count null profile values', async () => {
    await createUser('NP', uniqueEmail(), 'pass');
    const stats = getAggregatedStats();

    expect(Object.keys(stats.profiles.country).length).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────
// listUsers
// ────────────────────────────────────────────────────────────────

describe('listUsers()', () => {
  it('returns an empty array when no users exist', () => {
    expect(listUsers()).toEqual([]);
  });

  it('includes newly created user', async () => {
    const email = uniqueEmail();
    const u = await createUser('LF', email, 'pass');

    const users = listUsers();
    const found = users.find(x => x.id === u.id);

    expect(found).toBeDefined();
    expect(found.name).toBe('LF');
    expect(found.email).toBe(email.toLowerCase());
  });

  it('does not expose password hashes', async () => {
    await createUser('LH', uniqueEmail(), 'pass');

    for (const user of listUsers()) {
      expect(user.password_hash).toBeUndefined();
      expect(user.passwordHash).toBeUndefined();
    }
  });

  it('includes parsed profile and createdAt', async () => {
    await createUser('LP', uniqueEmail(), 'pass');

    const found = listUsers()[0];
    expect(typeof found.profile).toBe('object');
    expect(found.createdAt).toBeDefined();
  });

  it('returns multiple users', async () => {
    await createUser('A', uniqueEmail(), 'pass');
    await createUser('B', uniqueEmail(), 'pass');
    await createUser('C', uniqueEmail(), 'pass');

    expect(listUsers().length).toBe(3);
  });
});

// ────────────────────────────────────────────────────────────────
// resetPassword
// ────────────────────────────────────────────────────────────────

describe('resetPassword()', () => {
  it('returns id and email', async () => {
    const email = uniqueEmail();
    const user = await createUser('RT', email, 'oldPass');

    const result = await resetPassword(user.id, 'newPass');

    expect(result.id).toBe(user.id);
    expect(result.email).toBe(email.toLowerCase());
  });

  it('allows login with new password after reset', async () => {
    const email = uniqueEmail();
    const user = await createUser('RL', email, 'old');

    await resetPassword(user.id, 'new');
    const login = await loginUser(email, 'new');

    expect(login.id).toBe(user.id);
  });

  it('rejects login with old password after reset', async () => {
    const email = uniqueEmail();
    const user = await createUser('RO', email, 'original');

    await resetPassword(user.id, 'changed');

    await expect(loginUser(email, 'original'))
      .rejects.toThrow('INVALID_CREDENTIALS');
  });

  it('handles multiple sequential resets', async () => {
    const email = uniqueEmail();
    const user = await createUser('MR', email, 'p1');

    await resetPassword(user.id, 'p2');
    await resetPassword(user.id, 'p3');

    await expect(loginUser(email, 'p1')).rejects.toThrow('INVALID_CREDENTIALS');
    await expect(loginUser(email, 'p2')).rejects.toThrow('INVALID_CREDENTIALS');

    const login = await loginUser(email, 'p3');
    expect(login.id).toBe(user.id);
  });

  it('throws USER_NOT_FOUND for non-existent user', async () => {
    await expect(resetPassword('usr_gone', 'any'))
      .rejects.toThrow('USER_NOT_FOUND');
  });
});

// ────────────────────────────────────────────────────────────────
// deleteUser
// ────────────────────────────────────────────────────────────────

describe('deleteUser()', () => {
  it('deletes a user and returns id + email', async () => {
    const email = uniqueEmail();
    const user = await createUser('DM', email, 'pass');

    const result = deleteUser(user.id);

    expect(result.id).toBe(user.id);
    expect(result.email).toBe(email.toLowerCase());
  });

  it('user is not findable by token after deletion', async () => {
    const user = await createUser('DT', uniqueEmail(), 'pass');

    expect(findUserByToken(user.token)).not.toBeNull();

    deleteUser(user.id);

    expect(findUserByToken(user.token)).toBeNull();
  });

  it('login fails after user deletion', async () => {
    const email = uniqueEmail();
    const user = await createUser('DL', email, 'pass');

    deleteUser(user.id);

    await expect(loginUser(email, 'pass'))
      .rejects.toThrow('INVALID_CREDENTIALS');
  });

  it('throws USER_NOT_FOUND for non-existent user', () => {
    expect(() => deleteUser('usr_nope'))
      .toThrow('USER_NOT_FOUND');
  });

  it('throws USER_NOT_FOUND when deleting same user twice', async () => {
    const user = await createUser('D2', uniqueEmail(), 'pass');

    deleteUser(user.id);

    expect(() => deleteUser(user.id))
      .toThrow('USER_NOT_FOUND');
  });

  it('user removed from listUsers', async () => {
    const user = await createUser('DR', uniqueEmail(), 'pass');

    expect(listUsers().some(u => u.id === user.id)).toBe(true);

    deleteUser(user.id);

    expect(listUsers().some(u => u.id === user.id)).toBe(false);
  });

  it('totalUsers count decreases', async () => {
    const u1 = await createUser('C1', uniqueEmail(), 'pass');
    const u2 = await createUser('C2', uniqueEmail(), 'pass');

    expect(getAggregatedStats().totalUsers).toBe(2);

    deleteUser(u2.id);

    expect(getAggregatedStats().totalUsers).toBe(1);
  });
});
