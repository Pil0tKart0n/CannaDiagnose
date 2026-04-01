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
  };

  users.push(user);
  writeUsers(users);

  return { id: user.id, name: user.name, email: user.email, token: user.token };
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

  return { id: user.id, name: user.name, email: user.email, token: user.token };
}

function findUserByToken(token) {
  if (!token) return null;
  const users = readUsers();
  const user = users.find(u => u.token === token);
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email };
}

module.exports = { createUser, loginUser, findUserByToken };
