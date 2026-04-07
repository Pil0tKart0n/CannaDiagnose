/**
 * Admin routes — all /api/admin/* endpoints.
 * Extracted from index.js for modularity.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const {
  db, feedbackImagesDir, scanImagesDir,
  stmtFeedbackStats, stmtFeedbackRecent,
} = require('../db');

// Server-side prompts (for recheck feature)
const { SYSTEM_PROMPT, buildUserPrompt } = require('../prompts');

const router = express.Router();

const ADMIN_KEY = process.env.ADMIN_KEY;
if (!ADMIN_KEY) {
  console.error('[LeafScan] FATAL: ADMIN_KEY environment variable is required');
  process.exit(1);
}
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const dbPath = path.join(__dirname, '..', 'data', 'leafscan.db');

// ── Prepared statements used only in admin routes ──
const stmtDetailedFeedbackAll = db.prepare(`SELECT * FROM feedback_detailed ORDER BY created_at DESC LIMIT ?`);
const stmtDetailedFeedbackNegative = db.prepare(`SELECT * FROM feedback_detailed WHERE rating = 'negative' ORDER BY created_at DESC LIMIT ?`);

/** Admin auth middleware (guard function) */
function adminAuth(req, res) {
  const key = req.headers['x-leafscan-key'] || req.query.key;
  if (key !== ADMIN_KEY) {
    res.status(403).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// ── Feedback overview ──
router.get('/api/admin/feedback', (req, res) => {
  const key = req.headers['x-leafscan-key'] || req.query.key;
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const stats = stmtFeedbackStats.all();
  const recent = stmtFeedbackRecent.all(limit);
  const total = stats.reduce((sum, s) => sum + s.count, 0);
  const positive = stats.find(s => s.rating === 'positive')?.count || 0;
  const negative = stats.find(s => s.rating === 'negative')?.count || 0;
  res.json({
    summary: { total, positive, negative, satisfaction: total > 0 ? Math.round(positive / total * 100) : 0 },
    recent,
  });
});

// ── Detailed feedback for learning (admin only) ──
router.get('/api/admin/feedback-detailed', (req, res) => {
  const key = req.headers['x-leafscan-key'] || req.query.key;
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const onlyNegative = req.query.negative === 'true';
  const rows = onlyNegative ? stmtDetailedFeedbackNegative.all(limit) : stmtDetailedFeedbackAll.all(limit);

  // Parse JSON fields
  const entries = rows.map(row => ({
    id: row.id,
    rating: row.rating,
    diagnosis: row.diagnosis_json ? JSON.parse(row.diagnosis_json) : null,
    questionnaire: row.questionnaire_json ? JSON.parse(row.questionnaire_json) : null,
    images: row.image_paths ? JSON.parse(row.image_paths) : [],
    created_at: row.created_at,
  }));

  res.json({ count: entries.length, entries });
});

// Serve feedback images (admin only)
router.get('/api/admin/feedback-image/:filename', (req, res) => {
  const key = req.headers['x-leafscan-key'] || req.query.key;
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  const filename = req.params.filename.replace(/[^a-zA-Z0-9._-]/g, '');
  const filepath = path.resolve(feedbackImagesDir, filename);
  if (!filepath.startsWith(path.resolve(feedbackImagesDir))) {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (fs.existsSync(filepath)) {
    res.sendFile(filepath);
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

// Serve scan images (admin only)
router.get('/api/admin/scan-image/:filename', (req, res) => {
  const key = req.headers['x-leafscan-key'] || req.query.key;
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  const filename = req.params.filename.replace(/[^a-zA-Z0-9._-]/g, '');
  const filepath = path.resolve(scanImagesDir, filename);
  if (!filepath.startsWith(path.resolve(scanImagesDir))) {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (fs.existsSync(filepath)) {
    res.sendFile(filepath);
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

// ── Dashboard overview ──
router.get('/api/admin/dashboard', (req, res) => {
  if (!adminAuth(req, res)) return;

  const scansToday = db.prepare(`SELECT COUNT(*) as c FROM scan_log WHERE scanned_at >= date('now')`).get().c;
  const scansWeek = db.prepare(`SELECT COUNT(*) as c FROM scan_log WHERE scanned_at >= date('now', '-7 days')`).get().c;
  const scansTotal = db.prepare(`SELECT COUNT(*) as c FROM scan_log`).get().c;

  const uniqueToday = db.prepare(`SELECT COUNT(DISTINCT ip) as c FROM scan_log WHERE scanned_at >= date('now')`).get().c;
  const uniqueTotal = db.prepare(`SELECT COUNT(DISTINCT ip) as c FROM scan_log`).get().c;

  const feedbackStats = stmtFeedbackStats.all();
  const totalFeedback = feedbackStats.reduce((sum, s) => sum + s.count, 0);
  const positiveFeedback = feedbackStats.find(s => s.rating === 'positive')?.count || 0;
  const negativeFeedback = feedbackStats.find(s => s.rating === 'negative')?.count || 0;

  const activePremium = db.prepare(`SELECT COUNT(*) as c FROM premium_sessions WHERE active = 1`).get().c;
  const activePromos = db.prepare(`SELECT COUNT(*) as c FROM promo_redemptions WHERE expires_at > datetime('now')`).get().c;

  // Token usage today (split by input/output for accurate cost calculation)
  const usageToday = db.prepare(`SELECT COALESCE(SUM(total_tokens), 0) as t, COALESCE(SUM(prompt_tokens), 0) as inp, COALESCE(SUM(completion_tokens), 0) as out FROM api_usage WHERE created_at >= date('now')`).get();
  const usageMonth = db.prepare(`SELECT COALESCE(SUM(total_tokens), 0) as t, COALESCE(SUM(prompt_tokens), 0) as inp, COALESCE(SUM(completion_tokens), 0) as out FROM api_usage WHERE created_at >= date('now', '-30 days')`).get();
  const tokensToday = usageToday.t;
  const tokensMonth = usageMonth.t;

  // Accurate cost calculation: GPT-4o pricing $2.50/1M input, $10.00/1M output
  const costToday = (usageToday.inp / 1000000 * 2.50 + usageToday.out / 1000000 * 10.00).toFixed(2);
  const costMonth = (usageMonth.inp / 1000000 * 2.50 + usageMonth.out / 1000000 * 10.00).toFixed(2);

  // Average cost per scan (diagnose calls only, last 30 days)
  const avgScan = db.prepare(`SELECT COALESCE(AVG(prompt_tokens), 0) as inp, COALESCE(AVG(completion_tokens), 0) as out FROM api_usage WHERE mode = 'diagnose' AND created_at >= date('now', '-30 days')`).get();
  const avgCostPerScan = (avgScan.inp / 1000000 * 2.50 + avgScan.out / 1000000 * 10.00).toFixed(4);

  res.json({
    scans: { today: scansToday, week: scansWeek, total: scansTotal },
    users: { today: uniqueToday, total: uniqueTotal },
    feedback: { total: totalFeedback, positive: positiveFeedback, negative: negativeFeedback, satisfaction: totalFeedback > 0 ? Math.round(positiveFeedback / totalFeedback * 100) : 0 },
    premium: { active: activePremium, promos: activePromos },
    tokens: { today: tokensToday, month: tokensMonth, costToday, costMonth, avgCostPerScan },
  });
});

// ── Scan statistics over time ──
router.get('/api/admin/stats/scans', (req, res) => {
  if (!adminAuth(req, res)) return;
  const days = Math.min(parseInt(req.query.days) || 30, 90);
  const rows = db.prepare(`
    SELECT date(scanned_at) as day, COUNT(*) as scans, COUNT(DISTINCT ip) as users
    FROM scan_log
    WHERE scanned_at >= date('now', '-' || ? || ' days')
    GROUP BY date(scanned_at)
    ORDER BY day
  `).all(days);
  res.json({ days, data: rows });
});

// ── Top diagnoses (from scan_results, with optional feedback rating) ──
router.get('/api/admin/stats/diagnoses', (req, res) => {
  if (!adminAuth(req, res)) return;
  const rows = db.prepare(`
    SELECT sr.diagnosis, COUNT(*) as count,
           ROUND(AVG(sr.confidence), 2) as avg_confidence,
           SUM(CASE WHEN f.rating = 'positive' THEN 1 ELSE 0 END) as positive,
           SUM(CASE WHEN f.rating = 'negative' THEN 1 ELSE 0 END) as negative
    FROM scan_results sr
    LEFT JOIN scan_log sl ON sl.id = sr.scan_log_id
    LEFT JOIN feedback f ON f.created_at BETWEEN datetime(sl.scanned_at, '-5 minutes') AND datetime(sl.scanned_at, '+5 minutes')
    WHERE sr.diagnosis IS NOT NULL AND sr.diagnosis != ''
    GROUP BY sr.diagnosis
    ORDER BY count DESC
    LIMIT 20
  `).all();
  res.json(rows);
});

// ── Substrate & fertilizer distribution ──
router.get('/api/admin/stats/substrates', (req, res) => {
  if (!adminAuth(req, res)) return;
  const substrates = db.prepare(`
    SELECT substrate, COUNT(*) as count FROM scan_results
    WHERE substrate IS NOT NULL AND substrate != ''
    GROUP BY substrate ORDER BY count DESC
  `).all();
  const fertilizers = db.prepare(`
    SELECT fertilizer, COUNT(*) as count FROM feedback
    WHERE fertilizer IS NOT NULL AND fertilizer != ''
    GROUP BY fertilizer ORDER BY count DESC LIMIT 20
  `).all();
  res.json({ substrates, fertilizers });
});

// ── Platform split (PWA vs APK) ──
router.get('/api/admin/stats/platforms', (req, res) => {
  if (!adminAuth(req, res)) return;
  const rows = db.prepare(`
    SELECT platform, COUNT(*) as count, SUM(total_tokens) as tokens
    FROM api_usage
    WHERE created_at >= date('now', '-30 days')
    GROUP BY platform
  `).all();
  res.json(rows);
});

// ── Hourly distribution (when do users scan?) ──
router.get('/api/admin/stats/hours', (req, res) => {
  if (!adminAuth(req, res)) return;
  const rows = db.prepare(`
    SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count
    FROM api_usage
    WHERE created_at >= date('now', '-30 days')
    GROUP BY hour ORDER BY hour
  `).all();
  res.json(rows);
});

// ── Token usage over time ──
router.get('/api/admin/stats/tokens', (req, res) => {
  if (!adminAuth(req, res)) return;
  const days = Math.min(parseInt(req.query.days) || 30, 90);
  const rows = db.prepare(`
    SELECT date(created_at) as day,
           SUM(prompt_tokens) as prompt_tokens,
           SUM(completion_tokens) as completion_tokens,
           SUM(total_tokens) as total_tokens,
           COUNT(*) as requests
    FROM api_usage
    WHERE created_at >= date('now', '-' || ? || ' days')
    GROUP BY date(created_at)
    ORDER BY day
  `).all(days);
  res.json({ days, data: rows });
});

// ── Promo code management ──
router.get('/api/admin/promos', (req, res) => {
  if (!adminAuth(req, res)) return;
  const codes = db.prepare(`SELECT * FROM promo_codes ORDER BY created_at DESC`).all();
  const redemptions = db.prepare(`
    SELECT pr.*, pc.days as code_days
    FROM promo_redemptions pr
    LEFT JOIN promo_codes pc ON pr.code = pc.code
    ORDER BY pr.redeemed_at DESC LIMIT 100
  `).all();
  res.json({ codes, redemptions });
});

router.post('/api/admin/promos', express.json(), (req, res) => {
  if (!adminAuth(req, res)) return;
  const { code, days, maxUses } = req.body || {};
  if (!code || !days) {
    return res.status(400).json({ error: 'code and days required' });
  }
  const cleanCode = code.trim().toUpperCase();
  try {
    db.prepare(`INSERT INTO promo_codes (code, days, max_uses) VALUES (?, ?, ?)`).run(cleanCode, days, maxUses || 9999);
    res.json({ success: true, code: cleanCode });
  } catch (err) {
    res.status(409).json({ error: 'Code already exists' });
  }
});

router.post('/api/admin/promos/toggle', express.json(), (req, res) => {
  if (!adminAuth(req, res)) return;
  const { code, active } = req.body || {};
  if (!code) return res.status(400).json({ error: 'code required' });
  db.prepare(`UPDATE promo_codes SET active = ? WHERE code = ?`).run(active ? 1 : 0, code);
  res.json({ success: true });
});

// ── Premium sessions overview ──
router.get('/api/admin/premium', (req, res) => {
  if (!adminAuth(req, res)) return;
  const active = db.prepare(`SELECT id, plan, stripe_customer_id, created_at FROM premium_sessions WHERE active = 1 ORDER BY created_at DESC`).all();
  const cancelled = db.prepare(`SELECT id, plan, stripe_customer_id, created_at FROM premium_sessions WHERE active = 0 ORDER BY created_at DESC LIMIT 50`).all();
  res.json({ active, cancelled });
});

// ── Manually grant premium (for testers/influencers) ──
router.post('/api/admin/premium/grant', express.json(), (req, res) => {
  if (!adminAuth(req, res)) return;
  const { days, note } = req.body || {};
  if (!days) return res.status(400).json({ error: 'days required' });

  // Create a promo code for manual grant
  const code = 'ADMIN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  db.prepare(`INSERT INTO promo_codes (code, days, max_uses) VALUES (?, ?, 1)`).run(code, days);
  res.json({ success: true, code, days, note: `Give this code to the user: ${code}` });
});

// ── IP Blacklist management ──
router.get('/api/admin/blacklist', (req, res) => {
  if (!adminAuth(req, res)) return;
  const list = db.prepare(`SELECT * FROM ip_blacklist ORDER BY created_at DESC`).all();
  res.json(list);
});

router.post('/api/admin/blacklist', express.json(), (req, res) => {
  if (!adminAuth(req, res)) return;
  const { ip, reason } = req.body || {};
  if (!ip) return res.status(400).json({ error: 'ip required' });
  try {
    db.prepare(`INSERT OR IGNORE INTO ip_blacklist (ip, reason) VALUES (?, ?)`).run(ip, reason || '');
    res.json({ success: true });
  } catch (err) {
    console.error('[LeafScan] Admin error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/api/admin/blacklist', express.json(), (req, res) => {
  if (!adminAuth(req, res)) return;
  const { ip } = req.body || {};
  if (!ip) return res.status(400).json({ error: 'ip required' });
  db.prepare(`DELETE FROM ip_blacklist WHERE ip = ?`).run(ip);
  res.json({ success: true });
});

// ── Rate limit hits tracking ──
// Note: ipRequestCounts is passed in via setIpRequestCounts()
let _ipRequestCounts = null;
function setIpRequestCounts(map) {
  _ipRequestCounts = map;
}

router.get('/api/admin/stats/ratelimits', (req, res) => {
  if (!adminAuth(req, res)) return;
  // Return current in-memory rate limit state
  const entries = [];
  if (_ipRequestCounts) {
    for (const [ip, count] of _ipRequestCounts.entries()) {
      if (count > 5) entries.push({ ip, requests: count });
    }
  }
  entries.sort((a, b) => b.requests - a.requests);
  res.json(entries);
});

// ── Disk usage (feedback images) ──
router.get('/api/admin/stats/disk', (req, res) => {
  if (!adminAuth(req, res)) return;
  try {
    const files = fs.readdirSync(feedbackImagesDir);
    let totalSize = 0;
    for (const f of files) {
      try {
        totalSize += fs.statSync(path.join(feedbackImagesDir, f)).size;
      } catch (e) { /* skip inaccessible files */ }
    }
    const dbSize = fs.statSync(dbPath).size;
    res.json({
      feedbackImages: { count: files.length, sizeBytes: totalSize, sizeMB: (totalSize / 1048576).toFixed(2) },
      database: { sizeBytes: dbSize, sizeMB: (dbSize / 1048576).toFixed(2) },
    });
  } catch (err) {
    res.json({ feedbackImages: { count: 0, sizeBytes: 0, sizeMB: '0' }, database: { sizeBytes: 0, sizeMB: '0' } });
  }
});

// ── Serve admin dashboard ──
router.get('/api/admin/board', (req, res) => {
  const key = req.headers['x-leafscan-key'] || req.query.key;
  if (key !== ADMIN_KEY) {
    return res.status(403).send('Unauthorized');
  }
  res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

// ── Funnel tracking ──
router.get('/api/admin/stats/funnel', (req, res) => {
  if (!adminAuth(req, res)) return;
  const days = Math.min(parseInt(req.query.days) || 7, 90);

  const events = db.prepare(`
    SELECT event, COUNT(*) as count, COUNT(DISTINCT ip) as unique_users
    FROM events
    WHERE created_at >= date('now', '-' || ? || ' days')
    GROUP BY event
    ORDER BY count DESC
  `).all(days);

  // Build funnel: page_home -> camera_open -> scan_start -> scan_complete -> feedback -> paywall_view -> purchase
  const funnelOrder = ['page_home', 'camera_open', 'scan_start', 'scan_complete', 'feedback_given', 'paywall_view', 'purchase_complete'];
  const funnel = funnelOrder.map(step => {
    const found = events.find(e => e.event === step);
    return { step, count: found?.count || 0, unique: found?.unique_users || 0 };
  });

  res.json({ days, funnel, allEvents: events });
});

// ── Retention (returning users) ──
router.get('/api/admin/stats/retention', (req, res) => {
  if (!adminAuth(req, res)) return;

  // Users who scanned on more than one distinct day
  const returning = db.prepare(`
    SELECT ip, COUNT(DISTINCT date(scanned_at)) as days_active,
           MIN(scanned_at) as first_scan, MAX(scanned_at) as last_scan
    FROM scan_log
    GROUP BY ip
    HAVING days_active > 1
    ORDER BY days_active DESC
    LIMIT 50
  `).all();

  // Weekly cohorts: for each week, how many unique users scanned
  const weekly = db.prepare(`
    SELECT strftime('%Y-W%W', scanned_at) as week,
           COUNT(DISTINCT ip) as users, COUNT(*) as scans
    FROM scan_log
    WHERE scanned_at >= date('now', '-90 days')
    GROUP BY week ORDER BY week
  `).all();

  // Total unique users and returning ratio
  const totalUnique = db.prepare(`SELECT COUNT(DISTINCT ip) as c FROM scan_log`).get()?.c || 0;
  const returningCount = returning.length;

  res.json({ totalUnique, returningCount, returningRate: totalUnique > 0 ? Math.round(returningCount / totalUnique * 100) : 0, returning, weekly });
});

// ── Diagnosis trends (seasonal/monthly) ──
router.get('/api/admin/stats/diagnosis-trends', (req, res) => {
  if (!adminAuth(req, res)) return;

  const rows = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, diagnosis, COUNT(*) as count
    FROM feedback
    WHERE diagnosis IS NOT NULL AND diagnosis != '' AND created_at >= date('now', '-12 months')
    GROUP BY month, diagnosis
    ORDER BY month, count DESC
  `).all();

  res.json(rows);
});

// ── Confidence tracking ──
router.get('/api/admin/stats/confidence', (req, res) => {
  if (!adminAuth(req, res)) return;
  const days = Math.min(parseInt(req.query.days) || 30, 90);

  const rows = db.prepare(`
    SELECT date(created_at) as day,
           ROUND(AVG(confidence), 3) as avg_confidence,
           MIN(confidence) as min_confidence,
           MAX(confidence) as max_confidence,
           COUNT(*) as count
    FROM feedback
    WHERE confidence IS NOT NULL AND created_at >= date('now', '-' || ? || ' days')
    GROUP BY day ORDER BY day
  `).all(days);

  res.json({ days, data: rows });
});

// ── Live feed (recent scans) ──
router.get('/api/admin/stats/livefeed', (req, res) => {
  if (!adminAuth(req, res)) return;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  // Combine scan_log with scan_results for recent activity
  const scans = db.prepare(`
    SELECT sl.ip, sl.scanned_at,
           sr.diagnosis, sr.severity, sr.confidence, sr.substrate,
           sr.mode, sr.platform, sr.is_premium, sr.image_paths,
           au.total_tokens
    FROM scan_log sl
    LEFT JOIN scan_results sr ON sr.scan_log_id = sl.id
       OR (sr.scan_log_id IS NULL AND sr.ip = sl.ip AND sr.created_at BETWEEN datetime(sl.scanned_at, '-1 minutes') AND datetime(sl.scanned_at, '+1 minutes'))
    LEFT JOIN api_usage au ON au.created_at BETWEEN datetime(sl.scanned_at, '-1 minutes') AND datetime(sl.scanned_at, '+1 minutes') AND au.ip = sl.ip
    ORDER BY sl.scanned_at DESC
    LIMIT ?
  `).all(limit);

  // Match feedback ratings + parse image_paths in JS
  if (scans.length > 0) {
    const feedbacks = db.prepare(`SELECT rating, diagnosis, created_at FROM feedback ORDER BY created_at DESC LIMIT 200`).all();
    for (const scan of scans) {
      // Parse image_paths JSON
      scan.images = scan.image_paths ? JSON.parse(scan.image_paths) : [];
      delete scan.image_paths;

      scan.rating = null;
      if (!scan.diagnosis) continue;
      const scanPrefix = scan.diagnosis.substring(0, 100);
      const scanTime = new Date(scan.scanned_at.replace(' ', 'T') + 'Z').getTime();
      for (const fb of feedbacks) {
        if (!fb.diagnosis || !fb.diagnosis.startsWith(scanPrefix)) continue;
        const fbTime = new Date(fb.created_at.replace(' ', 'T') + 'Z').getTime();
        const diff = fbTime - scanTime;
        if (diff >= -120000 && diff <= 600000) { // -2min to +10min
          scan.rating = fb.rating;
          break;
        }
      }
    }
  }

  res.json(scans);
});

// ── Recheck diagnosis (re-run with current prompt) ──
router.post('/api/admin/recheck', express.json({ limit: '30mb' }), async (req, res) => {
  if (!adminAuth(req, res)) return;
  const { feedbackId } = req.body || {};
  if (!feedbackId) return res.status(400).json({ error: 'feedbackId required' });

  // Get the original feedback entry
  const entry = db.prepare(`SELECT * FROM feedback_detailed WHERE id = ?`).get(feedbackId);
  if (!entry) return res.status(404).json({ error: 'Feedback entry not found' });

  const diagnosis = entry.diagnosis_json ? JSON.parse(entry.diagnosis_json) : null;
  const questionnaire = entry.questionnaire_json ? JSON.parse(entry.questionnaire_json) : null;
  const imagePaths = entry.image_paths ? JSON.parse(entry.image_paths) : [];

  if (imagePaths.length === 0) {
    return res.status(400).json({ error: 'No images stored for this feedback entry' });
  }

  // Read images from disk and convert to base64 data URIs
  const images = [];
  for (const filename of imagePaths) {
    const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const filepath = path.join(feedbackImagesDir, cleanName);
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath);
      const ext = cleanName.split('.').pop() || 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      images.push(`data:${mimeType};base64,${data.toString('base64')}`);
    }
  }

  if (images.length === 0) {
    return res.status(400).json({ error: 'Could not read stored images' });
  }

  // Re-run diagnosis with current prompt
  const imageBlocks = images.map(url => ({ type: 'image_url', image_url: { url } }));
  const userPrompt = questionnaire ? buildUserPrompt(questionnaire) : 'Analysiere diese Cannabis-Pflanze auf Mangelerscheinungen.';

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: [...imageBlocks, { type: 'text', text: userPrompt }] },
        ],
        model: 'gpt-4.1',
        max_tokens: 2048,
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    });

    const data = await openaiRes.json();
    const newDiagnosis = data.choices?.[0]?.message?.content ? JSON.parse(data.choices[0].message.content) : null;

    res.json({
      feedbackId,
      originalDiagnosis: diagnosis,
      newDiagnosis,
      originalRating: entry.rating,
      questionnaire,
      images: imagePaths,
    });
  } catch (err) {
    console.error('[LeafScan] Recheck failed:', err.message);
    res.status(500).json({ error: 'Recheck failed' });
  }
});

// ── Announcements management ──
router.get('/api/admin/announcements', (req, res) => {
  if (!adminAuth(req, res)) return;
  const rows = db.prepare(`SELECT * FROM announcements ORDER BY id DESC LIMIT 50`).all();
  res.json(rows);
});

router.post('/api/admin/announcements', express.json(), (req, res) => {
  if (!adminAuth(req, res)) return;
  const { message, type } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message required' });
  const result = db.prepare(`INSERT INTO announcements (message, type) VALUES (?, ?)`).run(message, type || 'info');
  res.json({ success: true, id: result.lastInsertRowid });
});

router.post('/api/admin/announcements/toggle', express.json(), (req, res) => {
  if (!adminAuth(req, res)) return;
  const { id, active } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id required' });
  db.prepare(`UPDATE announcements SET active = ? WHERE id = ?`).run(active ? 1 : 0, id);
  res.json({ success: true });
});

router.delete('/api/admin/announcements', express.json(), (req, res) => {
  if (!adminAuth(req, res)) return;
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id required' });
  db.prepare(`DELETE FROM announcements WHERE id = ?`).run(id);
  res.json({ success: true });
});

// ── Stripe Revenue stats ──
// Note: stripe instance is passed in via setStripe()
let _stripe = null;
function setStripe(stripeInstance) {
  _stripe = stripeInstance;
}

router.get('/api/admin/stats/revenue', async (req, res) => {
  if (!adminAuth(req, res)) return;

  try {
    // Get recent charges from Stripe
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60;
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayTimestamp = Math.floor(todayStart.getTime() / 1000);

    // Active subscriptions
    const subs = await _stripe.subscriptions.list({ status: 'active', limit: 100 });
    const mrr = subs.data.reduce((sum, s) => sum + (s.items.data[0]?.price?.unit_amount || 0), 0);

    // Recent charges
    const charges = await _stripe.charges.list({ created: { gte: thirtyDaysAgo }, limit: 100 });
    const revenueMonth = charges.data.filter(c => c.paid && !c.refunded).reduce((sum, c) => sum + c.amount, 0);
    const revenueWeek = charges.data.filter(c => c.paid && !c.refunded && c.created >= sevenDaysAgo).reduce((sum, c) => sum + c.amount, 0);
    const revenueToday = charges.data.filter(c => c.paid && !c.refunded && c.created >= todayTimestamp).reduce((sum, c) => sum + c.amount, 0);

    // Cancelled recently
    const cancelledSubs = await _stripe.subscriptions.list({ status: 'canceled', limit: 20 });
    const recentCancellations = cancelledSubs.data.filter(s => s.canceled_at >= thirtyDaysAgo).length;

    // Conversion: paywall views vs purchases (from events table)
    const paywallViews = db.prepare(`SELECT COUNT(*) as c FROM events WHERE event = 'paywall_view' AND created_at >= date('now', '-30 days')`).get()?.c || 0;
    const purchases = db.prepare(`SELECT COUNT(*) as c FROM events WHERE event = 'purchase_complete' AND created_at >= date('now', '-30 days')`).get()?.c || 0;

    res.json({
      mrr: mrr, // in cents
      revenueToday, // in cents
      revenueWeek,
      revenueMonth,
      activeSubscriptions: subs.data.length,
      recentCancellations,
      churnRate: subs.data.length > 0 ? Math.round(recentCancellations / (subs.data.length + recentCancellations) * 100) : 0,
      conversion: { paywallViews, purchases, rate: paywallViews > 0 ? Math.round(purchases / paywallViews * 100) : 0 },
    });
  } catch (err) {
    // If Stripe fails, return partial data
    res.json({
      mrr: 0, revenueToday: 0, revenueWeek: 0, revenueMonth: 0,
      activeSubscriptions: 0, recentCancellations: 0, churnRate: 0,
      conversion: { paywallViews: 0, purchases: 0, rate: 0 },
      error: 'Stripe data unavailable',
    });
  }
});

// ══════════════════════════════════════════════════════════════════
// ██  USER MANAGEMENT                                            ██
// ══════════════════════════════════════════════════════════════════

const { listUsers, resetPassword, deleteUser } = require('../users');

// ── List all users ──
router.get('/api/admin/users', (req, res) => {
  if (!adminAuth(req, res)) return;
  const users = listUsers();
  res.json({ users, total: users.length });
});

// ── Reset user password ──
router.post('/api/admin/users/:id/reset-password', express.json(), async (req, res) => {
  if (!adminAuth(req, res)) return;
  const { password } = req.body || {};
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  try {
    const result = await resetPassword(req.params.id, password);
    res.json({ ok: true, ...result });
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: err.message });
  }
});

// ── Delete user ──
router.delete('/api/admin/users/:id', (req, res) => {
  if (!adminAuth(req, res)) return;
  try {
    const result = deleteUser(req.params.id);
    res.json({ ok: true, ...result });
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, setIpRequestCounts, setStripe };
