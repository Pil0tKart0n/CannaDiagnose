/**
 * User management — SQLite-backed (migrated from JSON file).
 * Password hashing via Node.js crypto.scrypt (no external dependencies).
 */
const crypto = require('crypto');
const {
  stmtFindUserByEmail, stmtFindUserByToken, stmtFindUserById,
  stmtInsertUser, stmtUpdateToken, stmtUpdateProfile,
  stmtUpdatePassword, stmtDeleteUser: stmtDeleteUserRow,
  stmtListUsers, stmtCountUsers,
} = require('./db');

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

module.exports = { createUser, loginUser, findUserByToken, updateProfile, getAggregatedStats, listUsers, resetPassword, deleteUser };
