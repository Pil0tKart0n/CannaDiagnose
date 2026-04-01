/**
 * Auth routes — Register, Login, Get current user.
 */
const express = require('express');
const router = express.Router();
const { createUser, loginUser, findUserByToken, updateProfile } = require('../users');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rate limiter reference — set by index.js
let rateLimit = (req, res, next) => next();
function setRateLimit(rl) { rateLimit = rl; }

// ── POST /api/auth/register ──
router.post('/api/auth/register', rateLimit, express.json(), async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    return res.status(400).json({ error: 'invalid_name', message: 'Bitte gib deinen Namen ein.' });
  }
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'invalid_email', message: 'Bitte gib eine gültige E-Mail-Adresse ein.' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'invalid_password', message: 'Das Passwort muss mindestens 6 Zeichen lang sein.' });
  }
  if (name.trim().length > 100 || email.length > 200 || password.length > 200) {
    return res.status(400).json({ error: 'too_long', message: 'Eingabe zu lang.' });
  }

  try {
    const result = await createUser(name, email, password);
    console.log('[LeafScan] New user registered:', result.email);
    res.status(201).json({ token: result.token, user: { id: result.id, name: result.name, email: result.email, profile: result.profile } });
  } catch (err) {
    if (err.message === 'EMAIL_EXISTS') {
      return res.status(409).json({ error: 'email_exists', message: 'Diese E-Mail-Adresse ist bereits registriert.' });
    }
    console.error('[LeafScan] Register error:', err.message);
    res.status(500).json({ error: 'register_failed', message: 'Registrierung fehlgeschlagen.' });
  }
});

// ── POST /api/auth/login ──
router.post('/api/auth/login', rateLimit, express.json(), async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'invalid_email', message: 'Bitte gib eine gültige E-Mail-Adresse ein.' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'invalid_password', message: 'Bitte gib dein Passwort ein.' });
  }

  try {
    const result = await loginUser(email, password);
    console.log('[LeafScan] User logged in:', result.email);
    res.json({ token: result.token, user: { id: result.id, name: result.name, email: result.email, profile: result.profile } });
  } catch (err) {
    if (err.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ error: 'invalid_credentials', message: 'E-Mail oder Passwort falsch.' });
    }
    console.error('[LeafScan] Login error:', err.message);
    res.status(500).json({ error: 'login_failed', message: 'Login fehlgeschlagen.' });
  }
});

// ── GET /api/auth/me ──
router.get('/api/auth/me', rateLimit, (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const user = findUserByToken(token);

  if (!user) {
    return res.status(401).json({ error: 'unauthorized', message: 'Nicht eingeloggt.' });
  }

  res.json({ user });
});

// ── PUT /api/auth/profile ──
router.put('/api/auth/profile', rateLimit, express.json(), (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const user = findUserByToken(token);

  if (!user) {
    return res.status(401).json({ error: 'unauthorized', message: 'Nicht eingeloggt.' });
  }

  try {
    const profile = updateProfile(user.id, req.body || {});
    res.json({ profile });
  } catch (err) {
    console.error('[LeafScan] Profile update error:', err.message);
    res.status(500).json({ error: 'update_failed' });
  }
});

module.exports = { router, setRateLimit, findUserByToken };
