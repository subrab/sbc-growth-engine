import { query } from '../db/pool.js';
import { asyncHandler, validationError } from '../middleware/errorHandler.js';
import { ensureInsightsTables } from './insightsController.js';
import { ensureClientCare, runCheck, runAllChecks, problemsFor, statusFor, KINDS } from '../services/clientCare.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

function cleanUrl(v, label) {
  const s = str(v, 500);
  if (!s) return null;
  let u;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { throw validationError(`${label} doesn't look like a web address.`); }
  if (!/^https?:$/.test(u.protocol)) throw validationError(`${label} must start with http:// or https://`);
  return u.toString();
}
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

// Validates and normalises the editable fields. `partial` allows PATCH with a subset.
function pickFields(body, partial = false) {
  const f = {};
  if (!partial || 'client_name' in body) { f.client_name = str(body.client_name, 120); if (!f.client_name) throw validationError('Please enter the client name.'); }
  if (!partial || 'name' in body) { f.name = str(body.name, 120); if (!f.name) throw validationError('Please give the website or app a name.'); }
  if (!partial || 'kind' in body) { f.kind = KINDS.includes(body.kind) ? body.kind : 'website'; }
  if (!partial || 'url' in body) f.url = cleanUrl(body.url, 'The URL');
  if (!partial || 'store_url' in body) f.store_url = cleanUrl(body.store_url, 'The app store link');
  if (!partial || 'repo_url' in body) f.repo_url = cleanUrl(body.repo_url, 'The code repository link');
  if (!partial || 'plan' in body) f.plan = str(body.plan, 40);
  if (!partial || 'contract_end' in body) {
    const d = str(body.contract_end, 10);
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw validationError('Contract end date should be a date.');
    f.contract_end = d;
  }
  if (!partial || 'notes' in body) f.notes = str(body.notes, 2000);
  if ('active' in body) f.active = !!body.active;
  return f;
}

// Creates (or links) the SBC Insights site that counts this property's visitors.
async function ensureTrackingSite(requestedId, name, url) {
  await ensureInsightsTables();
  const id = slugify(requestedId || name);
  if (id.length < 2) throw validationError('Tracking ID should be at least 2 letters or numbers.');
  const domain = url ? new URL(url).hostname : null;
  await query(
    `INSERT INTO analytics_sites (id, name, domain) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET domain = COALESCE(analytics_sites.domain, EXCLUDED.domain)`,
    [id, name, domain]
  );
  return id;
}

async function loadProperties(whereId) {
  await ensureClientCare();
  await ensureInsightsTables();
  const { rows } = await query(
    `SELECT p.*,
            to_jsonb(c.*) AS last_check,
            (SELECT COUNT(*) FILTER (WHERE is_up)::float / NULLIF(COUNT(*), 0)
               FROM care_checks WHERE property_id = p.id AND checked_at > now() - interval '30 days') AS up_ratio_30d,
            t.visitors_7d, t.pageviews_7d
       FROM care_properties p
       LEFT JOIN LATERAL (SELECT * FROM care_checks WHERE property_id = p.id ORDER BY checked_at DESC LIMIT 1) c ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(DISTINCT visitor_hash) FILTER (WHERE event_type = 'pageview') AS visitors_7d,
                COUNT(*) FILTER (WHERE event_type = 'pageview') AS pageviews_7d
           FROM analytics_events
          WHERE p.insights_site_id IS NOT NULL AND site_id = p.insights_site_id
            AND created_at > now() - interval '7 days') t ON true
      ${whereId ? 'WHERE p.id = $1' : ''}
      ORDER BY p.active DESC, p.client_name, p.name`,
    whereId ? [whereId] : []
  );
  return rows.map((p) => {
    const check = p.last_check;
    return {
      ...p,
      visitors_7d: p.visitors_7d === null ? null : Number(p.visitors_7d),
      pageviews_7d: p.pageviews_7d === null ? null : Number(p.pageviews_7d),
      status: p.active ? statusFor(p, check) : 'paused',
      problems: p.active ? problemsFor(check) : [],
    };
  });
}

// GET /api/care
export const listProperties = asyncHandler(async (req, res) => {
  const properties = await loadProperties();
  const active = properties.filter((p) => p.active);
  res.json({
    properties,
    summary: {
      total: active.length,
      healthy: active.filter((p) => p.status === 'healthy').length,
      attention: active.filter((p) => p.status === 'attention' || p.status === 'down').length,
      last_checked: active.map((p) => p.last_check?.checked_at).filter(Boolean).sort().pop() || null,
    },
  });
});

// POST /api/care
export const createProperty = asyncHandler(async (req, res) => {
  await ensureClientCare();
  const f = pickFields(req.body || {});
  if (f.kind !== 'mobile_app' && !f.url) throw validationError('Please enter the website address to monitor.');
  const tracking = req.body?.tracking_id || (req.body?.enable_tracking && f.kind !== 'mobile_app' ? f.name : null);
  f.insights_site_id = tracking ? await ensureTrackingSite(tracking, `${f.client_name} · ${f.name}`, f.url) : null;
  const keys = Object.keys(f);
  const { rows } = await query(
    `INSERT INTO care_properties (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
    Object.values(f)
  );
  const id = rows[0].id;
  // First check straight away so the new property doesn't sit at "pending" until tomorrow.
  if (f.url) await runCheck({ id, url: f.url }).catch(() => {});
  res.status(201).json({ property: (await loadProperties(id))[0] });
});

// PATCH /api/care/:id
export const updateProperty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!UUID_RE.test(id)) return res.status(404).json({ error: 'That property could not be found.' });
  await ensureClientCare();
  const f = pickFields(req.body || {}, true);
  if ('tracking_id' in (req.body || {})) {
    f.insights_site_id = req.body.tracking_id ? await ensureTrackingSite(req.body.tracking_id, f.name || req.body.name || req.body.tracking_id, f.url) : null;
  }
  const keys = Object.keys(f);
  if (!keys.length) throw validationError('Nothing to update.');
  const { rowCount } = await query(
    `UPDATE care_properties SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')}, updated_at = now() WHERE id = $1`,
    [id, ...Object.values(f)]
  );
  if (!rowCount) return res.status(404).json({ error: 'That property could not be found.' });
  res.json({ property: (await loadProperties(id))[0] });
});

// DELETE /api/care/:id (its check history goes with it; visitor analytics are kept)
export const deleteProperty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!UUID_RE.test(id)) return res.status(404).json({ error: 'That property could not be found.' });
  await ensureClientCare();
  const { rowCount } = await query('DELETE FROM care_properties WHERE id = $1', [id]);
  if (!rowCount) return res.status(404).json({ error: 'That property could not be found.' });
  res.json({ deleted: true });
});

// POST /api/care/check  { id? }  — "Run checks now"
export const checkNow = asyncHandler(async (req, res) => {
  await ensureClientCare();
  const id = req.body?.id;
  if (id) {
    if (!UUID_RE.test(id)) return res.status(404).json({ error: 'That property could not be found.' });
    const { rows } = await query('SELECT * FROM care_properties WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'That property could not be found.' });
    await runCheck(rows[0]);
    return res.json({ property: (await loadProperties(id))[0] });
  }
  res.json(await runAllChecks({ notify: false }));
});

// GET /api/care/:id/checks — recent history
export const listChecks = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!UUID_RE.test(id)) return res.status(404).json({ error: 'That property could not be found.' });
  await ensureClientCare();
  const { rows } = await query(
    `SELECT id, checked_at, is_up, status_code, response_ms, security_score, error
       FROM care_checks WHERE property_id = $1 ORDER BY checked_at DESC LIMIT 30`, [id]
  );
  res.json({ checks: rows });
});

// GET /api/cron/client-care — called daily by Vercel Cron with the CRON_SECRET bearer token.
export const cronClientCare = asyncHandler(async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized' });
  res.json(await runAllChecks({ notify: true }));
});
