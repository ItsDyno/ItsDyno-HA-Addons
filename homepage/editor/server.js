#!/usr/bin/env node
// Homepage Config Editor – lightweight Node.js HTTP server (zero external dependencies)

const http   = require('http');
const fs     = require('fs');
const fsp    = require('fs').promises;
const path   = require('path');
const crypto = require('crypto');
const url    = require('url');

// ── Configuration (set by run.sh via environment variables) ──────────────────
const PASSWORD   = process.env.EDITOR_PASSWORD || '';
const CONFIG_DIR = process.env.HOMEPAGE_CONFIG_DIR || '/addon_configs/homepage';
const PORT       = parseInt(process.env.EDITOR_PORT || '3001', 10);

// Files the editor is allowed to read / write – prevents path-traversal attacks
const EDITABLE_FILES = [
  'settings.yaml',
  'services.yaml',
  'widgets.yaml',
  'bookmarks.yaml',
  'custom.css',
  'custom.js',
  'docker.yaml',
];

// ── Session store ────────────────────────────────────────────────────────────
const sessions = new Map();
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

function pruneExpiredSessions() {
  const now = Date.now();
  for (const [token, created] of sessions) {
    if (now - created > SESSION_MAX_AGE) sessions.delete(token);
  }
}
setInterval(pruneExpiredSessions, 60 * 60 * 1000); // every hour

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseCookies(raw) {
  const jar = {};
  (raw || '').split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    if (k) jar[k] = v.join('=');
  });
  return jar;
}

function isAuthed(req) {
  const token = parseCookies(req.headers.cookie).token;
  if (!token || !sessions.has(token)) return false;
  // Check expiry
  if (Date.now() - sessions.get(token) > SESSION_MAX_AGE) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let destroyed = false;
    req.on('data', c => {
      size += c.length;
      if (size > 2 * 1024 * 1024) {
        destroyed = true;
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (destroyed) return;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch { resolve(null); }
    });
    req.on('error', reject);
  });
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function safeFilename(name) {
  const base = path.basename(String(name || ''));
  return EDITABLE_FILES.includes(base) ? base : null;
}

// Timing-safe password comparison using SHA-256 so buffers are always equal length
function checkPassword(input) {
  if (!PASSWORD || !input) return false;
  const inputHash = crypto.createHash('sha256').update(String(input)).digest();
  const passHash  = crypto.createHash('sha256').update(PASSWORD).digest();
  return crypto.timingSafeEqual(inputHash, passHash);
}

// Simple brute-force mitigation: track failed attempts per IP
const failedAttempts = new Map();
function recordFailedAttempt(ip) {
  const info = failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  info.count += 1;
  info.lastAttempt = Date.now();
  failedAttempts.set(ip, info);
}
function isRateLimited(ip) {
  const info = failedAttempts.get(ip);
  if (!info) return false;
  // Reset after 15 minutes
  if (Date.now() - info.lastAttempt > 15 * 60 * 1000) {
    failedAttempts.delete(ip);
    return false;
  }
  return info.count >= 5;
}
function clearFailedAttempts(ip) {
  failedAttempts.delete(ip);
}

// ── Static HTML ──────────────────────────────────────────────────────────────
const HTML_PATH = path.join(__dirname, 'index.html');

// ── HTTP Server ──────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const clientIP = req.socket.remoteAddress;

  // ── POST /api/login ────────────────────────────────────────────────────
  if (pathname === '/api/login' && req.method === 'POST') {
    if (isRateLimited(clientIP)) {
      return json(res, 429, { error: 'Too many attempts – try again later' });
    }
    const body = await readBody(req);
    if (body && checkPassword(body.password)) {
      clearFailedAttempts(clientIP);
      const token = newToken();
      sessions.set(token, Date.now());
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': `token=${token}; Path=/; HttpOnly; SameSite=Strict`,
      });
      return res.end(JSON.stringify({ ok: true }));
    }
    recordFailedAttempt(clientIP);
    return json(res, 401, { error: 'Invalid password' });
  }

  // ── POST /api/logout ───────────────────────────────────────────────────
  if (pathname === '/api/logout' && req.method === 'POST') {
    const tok = parseCookies(req.headers.cookie).token;
    if (tok) sessions.delete(tok);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'token=; Path=/; HttpOnly; Max-Age=0',
    });
    return res.end(JSON.stringify({ ok: true }));
  }

  // ── Auth gate for API endpoints ────────────────────────────────────────
  if (pathname.startsWith('/api/') && !isAuthed(req)) {
    return json(res, 401, { error: 'Not authenticated' });
  }

  // ── GET /api/files — list editable config files ────────────────────────
  if (pathname === '/api/files' && req.method === 'GET') {
    const files = EDITABLE_FILES.map(f => ({
      name: f,
      exists: fs.existsSync(path.join(CONFIG_DIR, f)),
    }));
    return json(res, 200, files);
  }

  // ── GET /api/file?name=<file> — read file content ─────────────────────
  if (pathname === '/api/file' && req.method === 'GET') {
    const name = safeFilename(parsed.query.name);
    if (!name) return json(res, 400, { error: 'Invalid file name' });
    const full = path.join(CONFIG_DIR, name);
    let content = '';
    try { content = await fsp.readFile(full, 'utf-8'); } catch { /* file doesn't exist yet */ }
    return json(res, 200, { name, content });
  }

  // ── POST /api/file — save file content ─────────────────────────────────
  if (pathname === '/api/file' && req.method === 'POST') {
    const body = await readBody(req);
    if (!body) return json(res, 400, { error: 'Invalid request body' });
    const name = safeFilename(body.name);
    if (!name) return json(res, 400, { error: 'Invalid file name' });
    await fsp.writeFile(path.join(CONFIG_DIR, name), body.content || '', 'utf-8');
    return json(res, 200, { ok: true });
  }

  // ── Serve editor UI ────────────────────────────────────────────────────
  if (pathname === '/' || pathname === '/index.html') {
    try {
      const html = fs.readFileSync(HTML_PATH, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    } catch {
      res.writeHead(500);
      return res.end('Editor UI not found');
    }
  }

  // ── 404 ────────────────────────────────────────────────────────────────
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`[Editor] Homepage Config Editor running on port ${PORT}`);
});
