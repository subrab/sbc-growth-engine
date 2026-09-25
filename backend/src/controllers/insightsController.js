import crypto from 'crypto';
import { query } from '../db/pool.js';
import { asyncHandler, validationError } from '../middleware/errorHandler.js';

// ---------- One-time table setup (same SQL as db/migrations/003_insights.sql) ----------
const INSIGHTS_SQL = `
CREATE TABLE IF NOT EXISTS analytics_sites (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES analytics_sites(id) ON DELETE CASCADE,
  visitor_hash TEXT NOT NULL, session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('pageview','section_view','click','form_start','form_submit','leave')),
  name TEXT, path TEXT, source TEXT, referrer TEXT, device TEXT, country TEXT, value INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_analytics_site_time ON analytics_events (site_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events (site_id, session_id);
INSERT INTO analytics_sites (id, name, domain) VALUES ('sbclabs', 'SBC Labs', 'www.sbclabs.tech')
ON CONFLICT (id) DO NOTHING;`;

let ready = null;
function ensureInsightsTables() {
  if (!ready) {
    ready = query(INSIGHTS_SQL).catch((err) => { ready = null; throw err; });
  }
  return ready;
}

// ---------- Helpers ----------
const EVENT_TYPES = new Set(['pageview', 'section_view', 'click', 'form_start', 'form_submit', 'leave']);
const SALT = process.env.ANALYTICS_SALT || process.env.JWT_SECRET || 'sbc-insights';
const TZ = 'Asia/Kolkata';
const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

function clientIp(req) {
  const fwd = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.socket?.remoteAddress || '';
}

// Anonymous visitor id: changes every day, cannot be reversed to an IP address.
function visitorHash(req, siteId) {
  const day = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  return crypto.createHash('sha256')
    .update(`${SALT}|${siteId}|${day}|${clientIp(req)}|${req.headers['user-agent'] || ''}`)
    .digest('hex').slice(0, 20);
}

function deviceOf(ua = '') {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'Tablet';
  if (/mobi|iphone|android/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

// Crawlers, uptime monitors and the link-preview fetchers social apps run when a link is
// shared (Facebook, WhatsApp, LinkedIn, X, Telegram, Slack, ...). None of these are visitors.
// Careful: in-app browsers of real people ("[LinkedInApp]", "FBAN", "Instagram") must NOT match.
const BOT_UA = new RegExp([
  'bot', 'crawl', 'spider', 'slurp', 'preview', 'headless', 'lighthouse', 'pingdom', 'monitor',
  'facebookexternalhit', 'facebot', 'meta-externalagent', 'meta-externalfetcher', '^whatsapp',
  'slack-imgproxy', 'skypeuri', 'embedly', 'pinterest/',
  'google-inspectiontool', 'googleother', 'bingpreview', 'yandex', 'baidu', 'petal', 'ahrefs',
  'semrush', 'mj12', 'dataprovider', 'python-requests', 'python-urllib', 'curl', 'wget', 'axios',
  'node-fetch', 'go-http-client', 'java/', 'okhttp', 'scrapy', 'phantomjs', 'puppeteer', 'playwright',
].join('|'), 'i');
function isBot(ua = '') {
  return !ua || BOT_UA.test(ua);
}

// Turns a referrer + UTM tag into a friendly traffic source name.
const SOURCE_MAP = [
  [/google/, 'Google'], [/bing/, 'Bing'], [/duckduckgo/, 'DuckDuckGo'], [/yahoo/, 'Yahoo'],
  [/whatsapp|wa\.me/, 'WhatsApp'], [/linkedin|lnkd\.in/, 'LinkedIn'], [/facebook|fb\.com|fb\.me/, 'Facebook'],
  [/instagram/, 'Instagram'], [/^t\.co$|twitter|^x\.com$/, 'X (Twitter)'], [/youtube|youtu\.be/, 'YouTube'],
  [/chatgpt|openai/, 'ChatGPT'], [/claude/, 'Claude'],
];
const knownSource = (text) => SOURCE_MAP.find(([re]) => re.test(text))?.[1] || null;

function sourceOf(referrerDomain, utmSource, siteDomain) {
  if (utmSource) {
    const u = utmSource.toLowerCase();
    return knownSource(u) || u.charAt(0).toUpperCase() + u.slice(1);
  }
  if (!referrerDomain) return 'Direct';
  const d = referrerDomain.toLowerCase();
  if (siteDomain && d.endsWith(siteDomain.replace(/^www\./, ''))) return 'Direct';
  return knownSource(d) || d.replace(/^www\./, '');
}

function domainOf(url) {
  try { return new URL(url).hostname; } catch { return null; }
}

// ---------- Public: POST /api/public/track ----------
// Accepts one event or a small batch. Sent with navigator.sendBeacon as text/plain,
// so it must be parsed here rather than by express.json().
const siteCache = new Map();
async function getSite(id) {
  if (siteCache.has(id)) return siteCache.get(id);
  const { rows } = await query('SELECT id, domain FROM analytics_sites WHERE id = $1', [id]);
  const site = rows[0] || null;
  siteCache.set(id, site);
  return site;
}

export const track = asyncHandler(async (req, res) => {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(204).end(); }
  }
  const ua = req.headers['user-agent'] || '';
  if (!body || isBot(ua) || req.headers['dnt'] === '1') return res.status(204).end();

  await ensureInsightsTables();
  const site = await getSite(str(body.site, 40));
  if (!site) return res.status(204).end();

  const sessionId = str(body.sid, 40);
  if (!sessionId) return res.status(204).end();

  const events = (Array.isArray(body.events) ? body.events : [body]).slice(0, 20);
  const vHash = visitorHash(req, site.id);
  const device = deviceOf(ua);
  const country = str(req.headers['x-vercel-ip-country'], 4);

  const rows = [];
  for (const e of events) {
    if (!e || !EVENT_TYPES.has(e.type)) continue;
    const refDomain = e.type === 'pageview' ? domainOf(e.ref) : null;
    const source = e.type === 'pageview' ? sourceOf(refDomain, str(e.utm, 40), site.domain) : null;
    const value = Number.isFinite(Number(e.value)) ? Math.max(0, Math.min(86400, Math.round(Number(e.value)))) : null;
    rows.push([site.id, vHash, sessionId, e.type, str(e.name, 80), str(e.path, 200), source, refDomain, device, country, value]);
  }
  if (!rows.length) return res.status(204).end();

  const params = [];
  const values = rows.map((r, i) => {
    params.push(...r);
    const b = i * 11;
    return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},$${b + 11})`;
  });
  await query(
    `INSERT INTO analytics_events (site_id, visitor_hash, session_id, event_type, name, path, source, referrer, device, country, value)
     VALUES ${values.join(',')}`,
    params
  );
  res.status(204).end();
});

// ---------- Admin: GET /api/insights?site=sbclabs&days=30 ----------
export const getInsights = asyncHandler(async (req, res) => {
  await ensureInsightsTables();
  const site = str(req.query.site, 40) || 'sbclabs';
  const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const p = [site, days, TZ];
  // Every query covers "the last N calendar days in India time", including today.
  const RANGE = `site_id = $1 AND created_at >= (date_trunc('day', now() AT TIME ZONE $3) - ($2::int - 1) * interval '1 day') AT TIME ZONE $3`;

  const [sites, daily, today, totals, engaged, funnel, sources, devices, countries, sections, clicks, leads] = await Promise.all([
    query('SELECT id, name, domain FROM analytics_sites ORDER BY created_at'),
    query(
      `WITH d AS (
         SELECT generate_series((now() AT TIME ZONE $3)::date - ($2::int - 1), (now() AT TIME ZONE $3)::date, interval '1 day')::date AS day
       )
       SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
              COUNT(DISTINCT e.visitor_hash) FILTER (WHERE e.event_type = 'pageview')::int AS visitors,
              COUNT(*) FILTER (WHERE e.event_type = 'pageview')::int AS pageviews
         FROM d LEFT JOIN analytics_events e
           ON e.site_id = $1 AND (e.created_at AT TIME ZONE $3)::date = d.day
        GROUP BY d.day ORDER BY d.day`, p),
    query(
      `SELECT COUNT(DISTINCT visitor_hash)::int AS visitors FROM analytics_events
        WHERE site_id = $1 AND event_type = 'pageview'
          AND (created_at AT TIME ZONE $2)::date = (now() AT TIME ZONE $2)::date`, [site, TZ]),
    query(
      `SELECT COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'pageview')::int AS sessions,
              COUNT(*) FILTER (WHERE event_type = 'pageview')::int AS pageviews
         FROM analytics_events WHERE ${RANGE}`, p),
    query(
      `WITH s AS (
         SELECT session_id, MAX(value) FILTER (WHERE event_type = 'leave') AS secs
           FROM analytics_events WHERE ${RANGE} GROUP BY session_id
       )
       SELECT COALESCE(ROUND(AVG(secs)),0)::int AS avg_seconds FROM s WHERE secs IS NOT NULL`, p),
    query(
      `WITH s AS (
         SELECT session_id,
                BOOL_OR(event_type = 'pageview') AS visited,
                COUNT(*) FILTER (WHERE event_type = 'section_view') AS sections,
                MAX(value) FILTER (WHERE event_type = 'leave') AS secs,
                BOOL_OR(event_type = 'click') AS clicked,
                BOOL_OR(event_type = 'form_start' AND name LIKE 'enquiry%') AS started,
                BOOL_OR(event_type = 'form_submit' AND name LIKE 'enquiry%') AS submitted
           FROM analytics_events WHERE ${RANGE} GROUP BY session_id
       )
       SELECT COUNT(*) FILTER (WHERE visited)::int AS visited,
              COUNT(*) FILTER (WHERE visited AND (sections >= 3 OR secs >= 30 OR clicked))::int AS engaged,
              COUNT(*) FILTER (WHERE visited AND started)::int AS form_started,
              COUNT(*) FILTER (WHERE visited AND submitted)::int AS form_submitted
         FROM s`, p),
    query(
      `SELECT source AS label, COUNT(DISTINCT session_id)::int AS n FROM analytics_events
        WHERE ${RANGE} AND event_type = 'pageview' GROUP BY source ORDER BY n DESC LIMIT 10`, p),
    query(
      `SELECT device AS label, COUNT(DISTINCT session_id)::int AS n FROM analytics_events
        WHERE ${RANGE} AND event_type = 'pageview' GROUP BY device ORDER BY n DESC`, p),
    query(
      `SELECT COALESCE(country, 'Unknown') AS label, COUNT(DISTINCT session_id)::int AS n FROM analytics_events
        WHERE ${RANGE} AND event_type = 'pageview' GROUP BY 1 ORDER BY n DESC LIMIT 8`, p),
    query(
      `SELECT name AS label, COUNT(DISTINCT session_id)::int AS n FROM analytics_events
        WHERE ${RANGE} AND event_type = 'section_view' AND name IS NOT NULL GROUP BY name ORDER BY n DESC LIMIT 15`, p),
    query(
      `SELECT name AS label, COUNT(*)::int AS n FROM analytics_events
        WHERE ${RANGE} AND event_type = 'click' AND name IS NOT NULL GROUP BY name ORDER BY n DESC LIMIT 15`, p),
    // Leads captured in the same window (only meaningful for SBC Labs' own site).
    site === 'sbclabs'
      ? query(
          `SELECT COUNT(*)::int AS n FROM leads
            WHERE source IN ('Website','Website Assessment')
              AND created_at >= (date_trunc('day', now() AT TIME ZONE $2) - ($1::int - 1) * interval '1 day') AT TIME ZONE $2`,
          [days, TZ]).catch(() => ({ rows: [{ n: null }] }))
      : Promise.resolve({ rows: [{ n: null }] }),
  ]);

  const f = funnel.rows[0];
  res.json({
    site, days, sites: sites.rows,
    kpis: {
      visitors_today: today.rows[0].visitors,
      visitors: daily.rows.reduce((s, d) => s + d.visitors, 0),
      sessions: totals.rows[0].sessions,
      pageviews: totals.rows[0].pageviews,
      avg_seconds: engaged.rows[0].avg_seconds,
      leads: leads.rows[0].n,
      conversion_rate: f.visited ? Math.round((f.form_submitted / f.visited) * 1000) / 10 : 0,
    },
    daily: daily.rows,
    funnel: f,
    sources: sources.rows, devices: devices.rows, countries: countries.rows,
    sections: sections.rows, clicks: clicks.rows,
  });
});
