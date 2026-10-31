import { photovaultPool, pvQuery } from '../db/photovaultPool.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const TZ = 'Asia/Kolkata';
const ACTIVE_DAYS = 7; // an install counts as "active" if it pinged in the last 7 days

// GET /api/photovault?days=30 — PhotoVault download funnel, read straight from the product DB.
export const getPhotoVault = asyncHandler(async (req, res) => {
  if (!photovaultPool) return res.json({ configured: false });

  const days = [7, 30, 90, 365].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const since = `now() - ($1::int * interval '1 day')`;

  const [kpis] = await pvQuery(`
    SELECT
      (SELECT count(*) FROM leads    WHERE created_at >= ${since})::int AS signups,
      (SELECT count(*) FROM installs WHERE first_seen >= ${since})::int AS installs,
      (SELECT count(*) FROM trials   WHERE started_at >= ${since})::int AS trials,
      (SELECT count(*) FROM orders   WHERE paid_at    >= ${since})::int AS paid,
      (SELECT COALESCE(sum(amount_paise),0) FROM orders WHERE paid_at >= ${since})::bigint AS revenue_paise,
      (SELECT count(*) FROM leads)::int AS signups_all,
      (SELECT count(*) FROM installs)::int AS installs_all,
      (SELECT count(*) FROM installs WHERE last_ping >= now() - interval '${ACTIVE_DAYS} days')::int AS active_installs,
      (SELECT count(*) FROM orders WHERE paid_at IS NOT NULL)::int AS paid_all,
      (SELECT COALESCE(sum(amount_paise),0) FROM orders WHERE paid_at IS NOT NULL)::bigint AS revenue_all_paise
  `, [days]);

  const daily = await pvQuery(`
    WITH d AS (
      SELECT generate_series((now() AT TIME ZONE '${TZ}')::date - ($1::int - 1), (now() AT TIME ZONE '${TZ}')::date, '1 day')::date AS day
    )
    SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
      (SELECT count(*) FROM leads    WHERE (created_at AT TIME ZONE '${TZ}')::date = d.day)::int AS signups,
      (SELECT count(*) FROM installs WHERE (first_seen AT TIME ZONE '${TZ}')::date = d.day)::int AS installs
    FROM d ORDER BY d.day
  `, [Math.min(days, 90)]);

  const people = await pvQuery(`
    SELECT l.name, l.email, l.phone, l.country, l.source, l.created_at,
           l.marketing_email, l.marketing_whatsapp,
           i.first_seen AS installed_at, i.last_ping, i.version, i.os, i.plan, i.library_size,
           (SELECT max(paid_at) FROM orders o WHERE o.email = l.email) AS paid_at
    FROM leads l
    LEFT JOIN LATERAL (
      SELECT * FROM installs WHERE installs.email = l.email ORDER BY last_ping DESC NULLS LAST LIMIT 1
    ) i ON true
    WHERE l.created_at >= ${since}
    ORDER BY l.created_at DESC
    LIMIT 200
  `, [days]);

  const versions = await pvQuery(`
    SELECT COALESCE(version,'unknown') AS label, count(*)::int AS n FROM installs GROUP BY 1 ORDER BY n DESC LIMIT 8`);
  const systems = await pvQuery(`
    SELECT COALESCE(os,'unknown') AS label, count(*)::int AS n FROM installs GROUP BY 1 ORDER BY n DESC LIMIT 8`);

  res.json({ configured: true, days, kpis, daily, people, versions, systems, activeDays: ACTIVE_DAYS });
});
