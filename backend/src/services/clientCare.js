import tls from 'node:tls';
import { query } from '../db/pool.js';
import { notifyOwner } from './whatsappNotify.js';

// Client Care: daily health and security checks for the websites, web apps and app backends
// SBC Labs maintains for clients. Every check is read-only and polite: one request each for
// the page, the http->https redirect, two well-known secret files, the TLS certificate and
// the public domain registry record.

const TIMEOUT_MS = 8000;
const UA = 'SBC-Labs-ClientCare/1.0 (+https://www.sbclabs.tech)';
export const KINDS = ['website', 'web_app', 'mobile_app'];

let ready = null;
export function ensureClientCare() {
  if (!ready) {
    ready = query(`
      CREATE TABLE IF NOT EXISTS care_properties (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_name      TEXT NOT NULL,
        name             TEXT NOT NULL,
        kind             TEXT NOT NULL DEFAULT 'website' CHECK (kind IN ('website','web_app','mobile_app')),
        url              TEXT,
        store_url        TEXT,
        repo_url         TEXT,
        insights_site_id TEXT,
        plan             TEXT,
        contract_end     DATE,
        notes            TEXT,
        active           BOOLEAN NOT NULL DEFAULT true,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS care_checks (
        id                BIGSERIAL PRIMARY KEY,
        property_id       UUID NOT NULL REFERENCES care_properties(id) ON DELETE CASCADE,
        checked_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        is_up             BOOLEAN,
        status_code       INTEGER,
        response_ms       INTEGER,
        ssl_expires_at    TIMESTAMPTZ,
        ssl_valid         BOOLEAN,
        domain_expires_at TIMESTAMPTZ,
        security_score    INTEGER,
        findings          JSONB,
        error             TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_care_checks_prop_time ON care_checks (property_id, checked_at DESC);
    `).catch((err) => { ready = null; throw err; });
  }
  return ready;
}

async function timedFetch(url, options = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal, headers: { 'user-agent': UA, ...(options.headers || {}) } });
  } finally {
    clearTimeout(t);
  }
}

function checkSsl(host) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port: 443, servername: host, timeout: TIMEOUT_MS }, () => {
      const cert = socket.getPeerCertificate();
      resolve({ expires: cert?.valid_to ? new Date(cert.valid_to) : null, valid: socket.authorized });
      socket.end();
    });
    socket.on('timeout', () => { socket.destroy(); reject(new Error('TLS timeout')); });
    socket.on('error', reject);
  });
}

// Hosting subdomains belong to the platform, not the client, so their domain expiry is irrelevant.
const PLATFORM_SUFFIXES = ['vercel.app', 'netlify.app', 'github.io', 'onrender.com', 'web.app', 'firebaseapp.com', 'herokuapp.com', 'pages.dev', 'azurewebsites.net'];
const SECOND_LEVEL = new Set(['co.in', 'org.in', 'net.in', 'firm.in', 'gen.in', 'ind.in', 'co.uk', 'org.uk', 'com.au', 'co.nz', 'com.sg', 'co.za']);
export function registrableDomain(host) {
  const h = host.toLowerCase().replace(/\.$/, '');
  if (PLATFORM_SUFFIXES.some((s) => h === s || h.endsWith('.' + s))) return null;
  const parts = h.split('.');
  if (parts.length < 2 || /^\d+$/.test(parts[parts.length - 1])) return null;
  const lastTwo = parts.slice(-2).join('.');
  return SECOND_LEVEL.has(lastTwo) && parts.length >= 3 ? parts.slice(-3).join('.') : lastTwo;
}

async function checkDomainExpiry(host) {
  const domain = registrableDomain(host);
  if (!domain) return null;
  const res = await timedFetch(`https://rdap.org/domain/${domain}`, { headers: { accept: 'application/rdap+json' } });
  if (!res.ok) return null;
  const data = await res.json();
  const ev = (data.events || []).find((e) => e.eventAction === 'expiration');
  return ev?.eventDate ? new Date(ev.eventDate) : null;
}

// A basic hygiene scan, not a penetration test. Points add up to 100.
async function checkSecurity(url, finalRes) {
  const findings = [];
  const add = (level, key, message, points = 0) => findings.push({ level, key, message, points });
  const u = new URL(url);
  const h = finalRes ? finalRes.headers : new Headers();
  let score = 0;

  const httpsOk = finalRes && new URL(finalRes.url).protocol === 'https:';
  if (httpsOk) { score += 15; add('ok', 'https', 'Site is served over HTTPS', 15); }
  else add('critical', 'https', 'Site is not served over HTTPS; visitors’ data is not encrypted');

  try {
    const r = await timedFetch(`http://${u.host}${u.pathname}`, { redirect: 'manual' });
    const loc = r.headers.get('location') || '';
    if (r.status >= 300 && r.status < 400 && loc.startsWith('https://')) { score += 10; add('ok', 'redirect', 'http:// visitors are redirected to https://', 10); }
    else add('warning', 'redirect', 'http:// is not redirected to https://');
  } catch { add('warning', 'redirect', 'Could not check the http:// → https:// redirect'); }

  const has = (name) => !!h.get(name);
  const csp = h.get('content-security-policy') || '';
  if (has('strict-transport-security')) { score += 15; add('ok', 'hsts', 'HSTS forces browsers to always use HTTPS', 15); }
  else add('warning', 'hsts', 'Missing Strict-Transport-Security header (HSTS)');
  if (csp) { score += 10; add('ok', 'csp', 'Content-Security-Policy limits what scripts can run', 10); }
  else add('warning', 'csp', 'Missing Content-Security-Policy header (helps block injected scripts)');
  if ((h.get('x-content-type-options') || '').toLowerCase() === 'nosniff') { score += 10; add('ok', 'nosniff', 'X-Content-Type-Options is set', 10); }
  else add('warning', 'nosniff', 'Missing X-Content-Type-Options: nosniff');
  if (has('x-frame-options') || /frame-ancestors/i.test(csp)) { score += 10; add('ok', 'frames', 'Protected against clickjacking (framing)', 10); }
  else add('warning', 'frames', 'No clickjacking protection (X-Frame-Options or CSP frame-ancestors)');
  if (has('referrer-policy')) { score += 5; add('ok', 'referrer', 'Referrer-Policy is set', 5); }
  else add('info', 'referrer', 'No Referrer-Policy header');
  const server = `${h.get('server') || ''} ${h.get('x-powered-by') || ''}`;
  if (/\d+\.\d+/.test(server)) add('warning', 'version', `Server reveals software versions (${server.trim()})`);
  else { score += 5; add('ok', 'version', 'Server does not reveal software versions', 5); }

  // Secret files that must never be public. Single-page sites answer every path with their HTML,
  // so only a non-HTML response with the file's real content counts as exposed.
  let exposed = [];
  await Promise.all([
    ['/.env', (t) => /^[A-Z0-9_]+\s*=/m.test(t)],
    ['/.git/config', (t) => /\[core\]/.test(t)],
  ].map(async ([path, looksReal]) => {
    try {
      const r = await timedFetch(`${u.protocol}//${u.host}${path}`, { redirect: 'manual' });
      if (r.status !== 200 || /html/i.test(r.headers.get('content-type') || '')) return;
      if (looksReal((await r.text()).slice(0, 5000))) exposed.push(path);
    } catch { /* unreachable is fine */ }
  }));
  if (exposed.length) add('critical', 'exposed', `Secret files are publicly readable: ${exposed.join(', ')}`);
  else { score += 20; add('ok', 'exposed', 'No secret files (.env, .git) exposed', 20); }

  return { score: exposed.length ? Math.min(score, 30) : score, findings };
}

export async function runCheck(property) {
  if (!property.url) return null;
  const started = Date.now();
  let res = null; let error = null;
  try { res = await timedFetch(property.url, { redirect: 'follow' }); await res.arrayBuffer(); }
  catch (e) { error = e.name === 'AbortError' ? 'No response within 8 seconds' : e.message; }
  const responseMs = res ? Date.now() - started : null;
  const isUp = !!res && res.status < 400;
  const host = new URL(property.url).hostname;

  const [ssl, domain, security] = await Promise.allSettled([
    checkSsl(host), checkDomainExpiry(host), res ? checkSecurity(property.url, res) : Promise.resolve(null),
  ]);
  const sslVal = ssl.status === 'fulfilled' ? ssl.value : null;
  const sec = security.status === 'fulfilled' ? security.value : null;

  const { rows } = await query(
    `INSERT INTO care_checks (property_id, is_up, status_code, response_ms, ssl_expires_at, ssl_valid,
                              domain_expires_at, security_score, findings, error)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [property.id, isUp, res?.status ?? null, responseMs, sslVal?.expires ?? null, sslVal?.valid ?? null,
     domain.status === 'fulfilled' ? domain.value : null, sec?.score ?? null,
     sec ? JSON.stringify(sec.findings) : null, error || (!isUp && res ? `HTTP ${res.status}` : null)]
  );
  return rows[0];
}

const daysUntil = (d) => (d ? Math.floor((new Date(d) - Date.now()) / 86400000) : null);

// Plain-language problems for a check; empty means healthy.
export function problemsFor(check) {
  if (!check) return [];
  const p = [];
  if (!check.is_up) p.push(check.error ? `Down (${check.error})` : 'Down');
  if (check.ssl_valid === false) p.push('SSL certificate is not trusted');
  const ssl = daysUntil(check.ssl_expires_at);
  if (ssl !== null && ssl < 21) p.push(ssl < 0 ? 'SSL certificate has expired' : `SSL certificate expires in ${ssl} days`);
  const dom = daysUntil(check.domain_expires_at);
  if (dom !== null && dom < 30) p.push(dom < 0 ? 'Domain has expired' : `Domain expires in ${dom} days`);
  const critical = (key) => (check.findings || []).some((f) => f.level === 'critical' && f.key === key);
  if (check.is_up && critical('https')) p.push('Not using HTTPS');
  if (critical('exposed')) p.push('Secret files are publicly readable');
  else if (check.security_score !== null && check.security_score < 50) p.push(`Low security score (${check.security_score}/100)`);
  return p;
}

export function statusFor(property, check) {
  if (!property.url) return 'not_monitored';
  if (!check) return 'pending';
  if (!check.is_up) return 'down';
  return problemsFor(check).length ? 'attention' : 'healthy';
}

export async function runAllChecks({ notify = false } = {}) {
  await ensureClientCare();
  const { rows: props } = await query(`SELECT * FROM care_properties WHERE active AND url IS NOT NULL ORDER BY client_name, name`);
  const results = await Promise.all(props.map(async (p) => {
    try { const check = await runCheck(p); return { property: p, check, problems: problemsFor(check) }; }
    catch (e) { return { property: p, check: null, problems: [`Check failed: ${e.message}`] }; }
  }));
  const troubled = results.filter((r) => r.problems.length);
  let notified = false;
  if (notify && troubled.length) {
    const base = (process.env.APP_BASE_URL || '').replace(/\/$/, '');
    const lines = [`🛡️ Client Care: ${troubled.length} of ${results.length} need attention`, ''];
    troubled.slice(0, 10).forEach((r) => lines.push(`• ${r.property.client_name} · ${r.property.name}: ${r.problems.join('; ')}`));
    if (base) lines.push('', `Open: ${base}/app/care`);
    notified = await notifyOwner(lines.join('\n'));
  }
  return { checked: results.length, attention: troubled.length, notified };
}
