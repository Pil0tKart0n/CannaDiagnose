/**
 * Database module — SQLite connection, schema, migrations, prepared statements.
 * Extracted from index.js for modularity (ADR-001).
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// ── Database connection ──
const dbPath = path.join(__dirname, 'data', 'leafscan.db');
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// ── Core schema ──
db.exec(`
  CREATE TABLE IF NOT EXISTS scan_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    scanned_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_scan_ip_date ON scan_log(ip, scanned_at);

  CREATE TABLE IF NOT EXISTS premium_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan TEXT NOT NULL DEFAULT 'pro',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX IF NOT EXISTS idx_premium_token ON premium_sessions(session_token);
  CREATE INDEX IF NOT EXISTS idx_premium_customer ON premium_sessions(stripe_customer_id);
  CREATE INDEX IF NOT EXISTS idx_premium_subscription ON premium_sessions(stripe_subscription_id);

  CREATE TABLE IF NOT EXISTS promo_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    days INTEGER NOT NULL DEFAULT 10,
    max_uses INTEGER NOT NULL DEFAULT 9999,
    used INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_promo_code ON promo_codes(code);

  CREATE TABLE IF NOT EXISTS promo_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    ip TEXT NOT NULL,
    device_id TEXT NOT NULL DEFAULT '',
    redeemed_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_promo_ip ON promo_redemptions(ip);

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rating TEXT NOT NULL CHECK(rating IN ('positive', 'negative')),
    diagnosis TEXT,
    severity TEXT,
    confidence REAL,
    substrate TEXT,
    fertilizer TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_feedback_date ON feedback(created_at);
`);

// ── Migrations ──
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback_detailed (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rating TEXT NOT NULL CHECK(rating IN ('positive', 'negative')),
      diagnosis_json TEXT,
      questionnaire_json TEXT,
      image_paths TEXT,
      ip TEXT,
      device_id TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_feedback_detailed_date ON feedback_detailed(created_at);
    CREATE INDEX IF NOT EXISTS idx_feedback_detailed_rating ON feedback_detailed(rating);
  `);
} catch (e) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT,
      mode TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT 'gpt-4o',
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      is_premium INTEGER NOT NULL DEFAULT 0,
      platform TEXT DEFAULT 'unknown',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage(created_at);
    CREATE INDEX IF NOT EXISTS idx_api_usage_mode ON api_usage(mode);
  `);
} catch (e) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ip_blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT UNIQUE NOT NULL,
      reason TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
} catch (e) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      ip TEXT,
      device_id TEXT DEFAULT '',
      platform TEXT DEFAULT 'unknown',
      meta TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_events_event ON events(event);
    CREATE INDEX IF NOT EXISTS idx_events_date ON events(created_at);
    CREATE INDEX IF NOT EXISTS idx_events_ip ON events(ip);
  `);
} catch (e) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
} catch (e) {}

try {
  db.exec(`ALTER TABLE promo_redemptions ADD COLUMN device_id TEXT NOT NULL DEFAULT ''`);
} catch (e) {}
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_promo_device ON promo_redemptions(device_id)`);
} catch (e) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scan_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_log_id INTEGER,
      ip TEXT,
      mode TEXT NOT NULL DEFAULT 'diagnose',
      diagnosis TEXT,
      severity TEXT,
      confidence REAL,
      substrate TEXT,
      is_premium INTEGER NOT NULL DEFAULT 0,
      platform TEXT DEFAULT 'unknown',
      result_json TEXT,
      image_paths TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_scan_results_date ON scan_results(created_at);
    CREATE INDEX IF NOT EXISTS idx_scan_results_scan ON scan_results(scan_log_id);
  `);
} catch (e) {}
try {
  db.exec(`ALTER TABLE scan_results ADD COLUMN image_paths TEXT`);
} catch (e) {}

// ── Migration: user_id on scan_log for per-user quota tracking ──
try {
  db.exec(`ALTER TABLE scan_log ADD COLUMN user_id TEXT DEFAULT NULL`);
} catch (e) {}
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_scan_user ON scan_log(user_id, scanned_at)`);
} catch (e) {}

// ── Migration: diary_entries table ──
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS diary_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      plant_name TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      grow_phase TEXT,
      height_cm REAL,
      ph_value REAL,
      ec_value REAL,
      temperature REAL,
      humidity REAL,
      watered INTEGER DEFAULT 0,
      nutrients_given INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_diary_user ON diary_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_diary_user_date ON diary_entries(user_id, created_at);
  `);
} catch (e) {}

// ── Migration: users table (replaces users.json) ──
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      token TEXT,
      profile_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);
  `);
} catch (e) {}

// Migrate existing users.json → SQLite (one-time)
try {
  const usersJsonPath = path.join(__dirname, 'data', 'users.json');
  if (fs.existsSync(usersJsonPath)) {
    const existing = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
    if (existing.length > 0) {
      const insert = db.prepare(`INSERT OR IGNORE INTO users (id, name, email, password_hash, token, profile_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      const migrate = db.transaction((users) => {
        for (const u of users) {
          insert.run(u.id, u.name, u.email, u.passwordHash, u.token, JSON.stringify(u.profile || {}), u.createdAt || new Date().toISOString());
        }
      });
      migrate(existing);
      // Rename old file so migration doesn't re-run
      fs.renameSync(usersJsonPath, usersJsonPath + '.migrated');
      console.log(`[LeafScan] Migrated ${existing.length} users from JSON to SQLite`);
    }
  }
} catch (e) {
  console.error('[LeafScan] Users JSON migration error:', e.message);
}

// ── Users prepared statements ──
const stmtFindUserByEmail = db.prepare(`SELECT * FROM users WHERE email = ?`);
const stmtFindUserByToken = db.prepare(`SELECT * FROM users WHERE token = ?`);
const stmtFindUserById = db.prepare(`SELECT * FROM users WHERE id = ?`);
const stmtInsertUser = db.prepare(`INSERT INTO users (id, name, email, password_hash, token, profile_json, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`);
const stmtUpdateToken = db.prepare(`UPDATE users SET token = ? WHERE id = ?`);
const stmtUpdateProfile = db.prepare(`UPDATE users SET profile_json = ? WHERE id = ?`);
const stmtUpdatePassword = db.prepare(`UPDATE users SET password_hash = ?, token = ? WHERE id = ?`);
const stmtDeleteUser = db.prepare(`DELETE FROM users WHERE id = ?`);
const stmtListUsers = db.prepare(`SELECT id, name, email, profile_json, created_at FROM users ORDER BY created_at DESC`);
const stmtCountUsers = db.prepare(`SELECT COUNT(*) as count FROM users`);

// ── Data directories ──
const feedbackImagesDir = path.join(__dirname, 'data', 'feedback_images');
fs.mkdirSync(feedbackImagesDir, { recursive: true });
const scanImagesDir = path.join(__dirname, 'data', 'scan_images');
fs.mkdirSync(scanImagesDir, { recursive: true });

// ── Prepared statements ──
const stmtCountScans = db.prepare(`
  SELECT COUNT(*) as count FROM scan_log
  WHERE ip = ? AND scanned_at >= date('now')
`);
const stmtInsertScan = db.prepare(`INSERT INTO scan_log (ip) VALUES (?)`);
const stmtAtomicScan = db.prepare(`
  INSERT INTO scan_log (ip)
  SELECT ? WHERE (SELECT COUNT(*) FROM scan_log WHERE ip = ? AND scanned_at >= date('now')) < ?
`);
const stmtRefundScan = db.prepare(`
  DELETE FROM scan_log WHERE id = (
    SELECT id FROM scan_log WHERE ip = ? ORDER BY id DESC LIMIT 1
  )
`);
const stmtUpdatePlan = db.prepare(`UPDATE premium_sessions SET plan = ? WHERE session_token = ?`);
const stmtFindSession = db.prepare(`SELECT * FROM premium_sessions WHERE session_token = ? AND active = 1`);
const stmtCreateSession = db.prepare(`
  INSERT INTO premium_sessions (session_token, stripe_customer_id, stripe_subscription_id, plan)
  VALUES (?, ?, ?, ?)
`);
const stmtFindByCustomer = db.prepare(`SELECT * FROM premium_sessions WHERE stripe_customer_id = ? AND active = 1`);
const stmtDeactivateBySubscription = db.prepare(`UPDATE premium_sessions SET active = 0 WHERE stripe_subscription_id = ?`);
const stmtDeactivateByCustomer = db.prepare(`UPDATE premium_sessions SET active = 0 WHERE stripe_customer_id = ?`);
const stmtInsertFeedback = db.prepare(`
  INSERT INTO feedback (rating, diagnosis, severity, confidence, substrate, fertilizer)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const stmtFeedbackStats = db.prepare(`
  SELECT rating, COUNT(*) as count FROM feedback GROUP BY rating
`);
const stmtFeedbackRecent = db.prepare(`
  SELECT * FROM feedback ORDER BY created_at DESC LIMIT ?
`);
const stmtFindPromo = db.prepare(`SELECT * FROM promo_codes WHERE code = ? AND active = 1`);
const stmtIncrementPromo = db.prepare(`UPDATE promo_codes SET used = used + 1 WHERE code = ?`);
const stmtCheckRedeemedByIp = db.prepare(`SELECT * FROM promo_redemptions WHERE ip = ? LIMIT 1`);
const stmtCheckRedeemedByDevice = db.prepare(`SELECT * FROM promo_redemptions WHERE device_id = ? AND device_id != '' LIMIT 1`);
const stmtRedeemPromo = db.prepare(`INSERT INTO promo_redemptions (code, ip, device_id, expires_at) VALUES (?, ?, ?, datetime('now', '+' || ? || ' days'))`);
const stmtActivePromo = db.prepare(`SELECT * FROM promo_redemptions WHERE (ip = ? OR (device_id = ? AND device_id != '')) AND expires_at > datetime('now') ORDER BY expires_at DESC LIMIT 1`);
const stmtInsertScanResult = db.prepare(`
  INSERT INTO scan_results (scan_log_id, ip, mode, diagnosis, severity, confidence, substrate, is_premium, platform, result_json, image_paths)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const stmtInsertUsage = db.prepare(`
  INSERT INTO api_usage (ip, mode, model, prompt_tokens, completion_tokens, total_tokens, is_premium, platform)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const stmtInsertEvent = db.prepare(`INSERT INTO events (event, ip, device_id, platform, meta) VALUES (?, ?, ?, ?, ?)`);
const stmtCheckBlacklist = db.prepare(`SELECT 1 FROM ip_blacklist WHERE ip = ?`);

// ── Auth-aware scan statements ──
const stmtAtomicScanUser = db.prepare(`
  INSERT INTO scan_log (ip, user_id)
  SELECT ?, ? WHERE (SELECT COUNT(*) FROM scan_log WHERE user_id = ? AND scanned_at >= date('now')) < ?
`);
const stmtCountScansUser = db.prepare(`
  SELECT COUNT(*) as count FROM scan_log
  WHERE user_id = ? AND scanned_at >= date('now')
`);
const stmtAtomicScanAnon48h = db.prepare(`
  INSERT INTO scan_log (ip)
  SELECT ? WHERE (SELECT COUNT(*) FROM scan_log WHERE ip = ? AND user_id IS NULL AND scanned_at >= datetime('now', '-48 hours')) < 1
`);
const stmtCountScansAnon48h = db.prepare(`
  SELECT COUNT(*) as count FROM scan_log
  WHERE ip = ? AND user_id IS NULL AND scanned_at >= datetime('now', '-48 hours')
`);

// ── Diary statements ──
const stmtInsertDiary = db.prepare(`
  INSERT INTO diary_entries (user_id, plant_name, title, note, grow_phase, height_cm, ph_value, ec_value, temperature, humidity, watered, nutrients_given)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const stmtGetDiary = db.prepare(`SELECT * FROM diary_entries WHERE user_id = ? ORDER BY created_at DESC`);
const stmtGetDiaryEntry = db.prepare(`SELECT * FROM diary_entries WHERE id = ? AND user_id = ?`);
const stmtUpdateDiary = db.prepare(`
  UPDATE diary_entries SET plant_name = ?, title = ?, note = ?, grow_phase = ?, height_cm = ?, ph_value = ?, ec_value = ?, temperature = ?, humidity = ?, watered = ?, nutrients_given = ?, updated_at = datetime('now')
  WHERE id = ? AND user_id = ?
`);
const stmtDeleteDiary = db.prepare(`DELETE FROM diary_entries WHERE id = ? AND user_id = ?`);
const stmtGetDiaryPlants = db.prepare(`SELECT DISTINCT plant_name FROM diary_entries WHERE user_id = ? ORDER BY plant_name`);
const stmtInsertDetailedFeedback = db.prepare(`
  INSERT INTO feedback_detailed (rating, diagnosis_json, questionnaire_json, image_paths, ip, device_id)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// ── Seed data ──
const seedPromo = db.prepare(`INSERT OR IGNORE INTO promo_codes (code, days, max_uses) VALUES (?, ?, ?)`);
seedPromo.run('HOMEGROW', 10, 9999);
seedPromo.run('HGC2026', 10, 9999);
const vipCodes = [
  'VIP-K7X2', 'VIP-M3R9', 'VIP-Q5W1', 'VIP-T8N4', 'VIP-J6P3',
  'VIP-H2L8', 'VIP-F9D5', 'VIP-B4G7', 'VIP-Y1C6', 'VIP-S7A2',
  'VIP-W3E9', 'VIP-N5V1', 'VIP-R8X4', 'VIP-L2Z6', 'VIP-D4U8',
];
for (const code of vipCodes) {
  seedPromo.run(code, 36500, 1);
}

// ── GDPR data cleanup ──
function cleanupOldData() {
  try {
    db.prepare(`DELETE FROM scan_log WHERE scanned_at < datetime('now', '-7 days')`).run();
    db.prepare(`DELETE FROM scan_results WHERE created_at < datetime('now', '-90 days')`).run();
    db.prepare(`DELETE FROM feedback WHERE created_at < datetime('now', '-90 days')`).run();
    const oldFeedback = db.prepare(`SELECT image_paths FROM feedback_detailed WHERE created_at < datetime('now', '-90 days')`).all();
    for (const row of oldFeedback) {
      if (row.image_paths) {
        try {
          const paths = JSON.parse(row.image_paths);
          for (const p of paths) {
            const fp = path.join(feedbackImagesDir, p.replace(/[^a-zA-Z0-9._-]/g, ''));
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
          }
        } catch (e) { console.error('[LeafScan] Feedback image cleanup error:', e.message); }
      }
    }
    db.prepare(`DELETE FROM feedback_detailed WHERE created_at < datetime('now', '-90 days')`).run();
    const oldScans = db.prepare(`SELECT image_paths FROM scan_results WHERE created_at < datetime('now', '-90 days') AND image_paths IS NOT NULL`).all();
    for (const row of oldScans) {
      try {
        const paths = JSON.parse(row.image_paths);
        for (const p of paths) {
          const fp = path.join(scanImagesDir, p.replace(/[^a-zA-Z0-9._-]/g, ''));
          if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
      } catch (e) { console.error('[LeafScan] Scan image cleanup error:', e.message); }
    }
    db.prepare(`DELETE FROM api_usage WHERE created_at < datetime('now', '-90 days')`).run();
    db.prepare(`DELETE FROM events WHERE created_at < datetime('now', '-90 days')`).run();
    console.log('[LeafScan] Data cleanup completed');
  } catch (e) {
    console.error('[LeafScan] Data cleanup error:', e.message);
  }
}
cleanupOldData();
setInterval(cleanupOldData, 24 * 60 * 60 * 1000);

const stmtCleanupScans = db.prepare(`DELETE FROM scan_log WHERE scanned_at < date('now', '-7 days')`);
function cleanupOldScans() {
  stmtCleanupScans.run();
}
setInterval(cleanupOldScans, 24 * 60 * 60 * 1000);
cleanupOldScans();

// ── Exports ──
module.exports = {
  db,
  feedbackImagesDir,
  scanImagesDir,
  // Scan
  stmtCountScans, stmtInsertScan, stmtAtomicScan, stmtRefundScan,
  // Premium
  stmtFindSession, stmtCreateSession, stmtFindByCustomer,
  stmtDeactivateBySubscription, stmtDeactivateByCustomer, stmtUpdatePlan,
  // Feedback
  stmtInsertFeedback, stmtFeedbackStats, stmtFeedbackRecent, stmtInsertDetailedFeedback,
  // Promo
  stmtFindPromo, stmtIncrementPromo, stmtCheckRedeemedByIp,
  stmtCheckRedeemedByDevice, stmtRedeemPromo, stmtActivePromo,
  // Scan results
  stmtInsertScanResult,
  // Usage & events
  stmtInsertUsage, stmtInsertEvent,
  // Security
  stmtCheckBlacklist,
  // Auth-aware scan
  stmtAtomicScanUser, stmtCountScansUser,
  stmtAtomicScanAnon48h, stmtCountScansAnon48h,
  // Diary
  stmtInsertDiary, stmtGetDiary, stmtGetDiaryEntry,
  stmtUpdateDiary, stmtDeleteDiary, stmtGetDiaryPlants,
  // Users
  stmtFindUserByEmail, stmtFindUserByToken, stmtFindUserById,
  stmtInsertUser, stmtUpdateToken, stmtUpdateProfile,
  stmtUpdatePassword, stmtDeleteUser: stmtDeleteUser,
  stmtListUsers, stmtCountUsers,
};
