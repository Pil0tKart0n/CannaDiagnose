/**
 * User management — stores users in a JSON file on the server.
 * Password hashing via Node.js crypto.scrypt (no external dependencies).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// Ensure data directory exists
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

function readUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[LeafScan] Error reading users file:', e.message);
  }
  return [];
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('hex'));
    });
  });
}

async function createUser(name, email, password) {
  const users = readUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('EMAIL_EXISTS');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await hashPassword(password, salt);
  const token = crypto.randomBytes(32).toString('hex');
  const id = 'usr_' + crypto.randomBytes(8).toString('hex');

  const user = {
    id,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: `${salt}:${hash}`,
    token,
    createdAt: new Date().toISOString(),
    // Grower profile (optional, filled later)
    profile: {
      country: null,
      growType: null,       // indoor | outdoor | greenhouse
      experience: null,     // beginner | intermediate | expert
      plantCount: null,     // 1-3 | 4-10 | 11-25 | 25+
      shopPreference: null, // online | local | both
    },
  };

  users.push(user);
  writeUsers(users);

  return { id: user.id, name: user.name, email: user.email, token: user.token, profile: user.profile };
}

async function loginUser(email, password) {
  const users = readUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) throw new Error('INVALID_CREDENTIALS');

  const [salt, storedHash] = user.passwordHash.split(':');
  const hash = await hashPassword(password, salt);
  if (hash !== storedHash) throw new Error('INVALID_CREDENTIALS');

  // Generate new token on each login
  user.token = crypto.randomBytes(32).toString('hex');
  writeUsers(users);

  return { id: user.id, name: user.name, email: user.email, token: user.token, profile: user.profile || {} };
}

function findUserByToken(token) {
  if (!token) return null;
  const users = readUsers();
  const user = users.find(u => u.token === token);
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, profile: user.profile || {} };
}

function updateProfile(userId, profileData) {
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  if (!user) throw new Error('USER_NOT_FOUND');

  const allowed = ['country', 'growType', 'experience', 'plantCount', 'shopPreference'];
  if (!user.profile) user.profile = {};
  for (const key of allowed) {
    if (profileData[key] !== undefined) {
      user.profile[key] = profileData[key];
    }
  }
  writeUsers(users);
  return user.profile;
}

function getAggregatedStats() {
  const users = readUsers();
  const stats = {
    totalUsers: users.length,
    profiles: { country: {}, growType: {}, experience: {}, plantCount: {}, shopPreference: {} },
  };
  for (const u of users) {
    const p = u.profile || {};
    for (const key of ['country', 'growType', 'experience', 'plantCount', 'shopPreference']) {
      if (p[key]) {
        stats.profiles[key][p[key]] = (stats.profiles[key][p[key]] || 0) + 1;
      }
    }
  }
  return stats;
}

module.exports = { createUser, loginUser, findUserByToken, updateProfile, getAggregatedStats };
