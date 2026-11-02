const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const STATE_FILE = path.join(ROOT, 'exam-state.json');
const PIN_FILE = path.join(ROOT, 'admin.pin');
const ASSETS = new Set(['index.html', 'manifest.json', 'sw.js', 'sman-logo.png', 'tka-sukses.png']);
const MIME = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' };

let adminPin;
try { adminPin = fs.readFileSync(PIN_FILE, 'utf8').trim(); }
catch { adminPin = String(crypto.randomInt(100000, 1000000)); fs.writeFileSync(PIN_FILE, adminPin, { mode: 0o600 }); }

let saved = {};
try { saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch {}
const state = {
  subject: typeof saved.subject === 'string' ? saved.subject : '',
  session: typeof saved.session === 'string' ? saved.session : '',
  startTime: typeof saved.startTime === 'string' ? saved.startTime : '',
  endTime: typeof saved.endTime === 'string' ? saved.endTime : '',
  token: '',
  tokenExpiresAt: 0,
  revision: 1
};

function send(res, status, data, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
}

function expireToken() {
  if (state.token && Date.now() >= state.tokenExpiresAt) {
    state.token = '';
    state.tokenExpiresAt = 0;
    state.revision++;
  }
}

function nextQuarterHour() {
  const next = new Date();
  next.setSeconds(0, 0);
  next.setMinutes((Math.floor(next.getMinutes() / 15) + 1) * 15);
  return next.getTime();
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

function readJson(req, maxBytes = 8192) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { raw += chunk; if (raw.length > maxBytes) reject(new Error('too-large')); });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('invalid-json')); } });
    req.on('error', reject);
  });
}

function pinMatches(value) {
  const a = Buffer.from(String(value || ''));
  const b = Buffer.from(adminPin);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/api/state' && req.method === 'GET') {
    expireToken();
    return send(res, 200, { ...state, serverTime: Date.now() });
  }
  if (url.pathname === '/api/admin/verify' && req.method === 'POST') {
    if (!sameOrigin(req)) return send(res, 403, { error: 'Origin ditolak.' });
    try {
      const body = await readJson(req);
      return send(res, pinMatches(body.pin) ? 200 : 401, { ok: pinMatches(body.pin) });
    } catch { return send(res, 400, { error: 'Permintaan tidak valid.' }); }
  }
  if (url.pathname === '/api/state' && req.method === 'POST') {
    if (!sameOrigin(req)) return send(res, 403, { error: 'Origin ditolak.' });
    if (!pinMatches(req.headers['x-admin-pin'])) return send(res, 401, { error: 'PIN pengelola salah.' });
    try {
      const body = await readJson(req);
      for (const key of ['subject', 'session']) {
        if (typeof body[key] === 'string') state[key] = body[key].trim().slice(0, 60);
      }
      for (const key of ['startTime', 'endTime']) {
        if (typeof body[key] === 'string' && (body[key] === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(body[key]))) state[key] = body[key];
      }
      if (typeof body.token === 'string') {
        state.token = body.token.trim().slice(0, 24);
        state.tokenExpiresAt = state.token ? nextQuarterHour() : 0;
      }
      fs.writeFileSync(STATE_FILE, JSON.stringify({ subject: state.subject, session: state.session, startTime: state.startTime, endTime: state.endTime }, null, 2));
      state.revision++;
      return send(res, 200, { ok: true, revision: state.revision, tokenExpiresAt: state.tokenExpiresAt });
    } catch (error) {
      return send(res, error.message === 'too-large' ? 413 : 400, { error: 'Data tidak valid.' });
    }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Metode tidak didukung.' });
  const name = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  if (!ASSETS.has(name)) return send(res, 404, { error: 'File tidak ditemukan.' });
  try {
    const content = fs.readFileSync(path.join(ROOT, name));
    res.writeHead(200, { 'Content-Type': MIME[path.extname(name)] || 'application/octet-stream', 'Cache-Control': name === 'sw.js' ? 'no-cache' : 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    return res.end(content);
  } catch { return send(res, 404, { error: 'File tidak ditemukan.' }); }
}

const server = http.createServer((req, res) => { handle(req, res).catch(() => send(res, 500, { error: 'Terjadi kesalahan pada server.' })); });
server.listen(PORT, '0.0.0.0', () => {
  console.log('\nServer aplikasi TKA aktif. Buka alamat yang sesuai di PC dan PID:');
  console.log(`  PC ini: http://localhost:${PORT}`);
  for (const entries of Object.values(os.networkInterfaces())) for (const item of entries || []) {
    if (item.family === 'IPv4' && !item.internal) console.log(`  Jaringan sekolah: http://${item.address}:${PORT}`);
  }
  console.log(`\nPIN pengelola: ${adminPin}`);
  console.log('Simpan PIN ini. Jendela server harus tetap terbuka selama aplikasi digunakan.\n');
});
