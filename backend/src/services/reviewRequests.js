import { query } from '../db/pool.js';

// Google review requests for won clients.
// When a lead becomes "Won", a follow-up is scheduled to ask for a Google review. Sending is
// one tap from the admin (opens WhatsApp/email with the message pre-written); after the first
// request one gentle reminder is scheduled a week later. Marking a client "Reviewed" stops it all.

const IST_TODAY = "(now() AT TIME ZONE 'Asia/Kolkata')::date";
export const REVIEW_TASK_KINDS = ['review_request', 'review_reminder'];

export const DEFAULT_SETTINGS = {
  google_review_link: '',
  review_request_message:
    "Hi {first_name}, thank you for choosing SBC Labs! If you're happy with the work we did, could you spare a minute to leave us a short Google review? It really helps a growing business like ours.\n\n{review_link}\n\nThank you!",
  review_reminder_message:
    "Hi {first_name}, just a gentle reminder in case it slipped by. If you have a minute, a short Google review about your experience with SBC Labs would mean a lot to us.\n\n{review_link}\n\nThanks again!",
};
export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

// Adds the few columns/tables this feature needs. Idempotent, runs once per server instance,
// and never changes or removes existing data.
let ready = null;
export function ensureReviewRequests() {
  if (!ready) {
    ready = query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key        TEXT PRIMARY KEY,
        value      TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS kind TEXT;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS review_status TEXT;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS review_asked_at TIMESTAMPTZ;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
    `).catch((err) => { ready = null; throw err; });
  }
  return ready;
}

export async function getSettings() {
  await ensureReviewRequests();
  const { rows } = await query('SELECT key, value FROM app_settings WHERE key = ANY($1)', [SETTING_KEYS]);
  const out = { ...DEFAULT_SETTINGS };
  rows.forEach((r) => { if (r.value !== null && r.value !== '') out[r.key] = r.value; });
  return out;
}

export async function saveSettings(values) {
  await ensureReviewRequests();
  for (const key of SETTING_KEYS) {
    if (values[key] === undefined) continue;
    await query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, String(values[key]).slice(0, 2000)]
    );
  }
  return getSettings();
}

// Called when a lead moves to "Won": schedule the first ask 3 days out (time to deliver/settle).
export async function scheduleReviewRequest(leadId) {
  await ensureReviewRequests();
  const { rows } = await query(
    `SELECT
       (SELECT review_status FROM leads WHERE id = $1) AS review_status,
       EXISTS (SELECT 1 FROM tasks WHERE lead_id = $1 AND kind = ANY($2)) AS has_task`,
    [leadId, REVIEW_TASK_KINDS]
  );
  if (!rows[0] || rows[0].has_task || rows[0].review_status) return false;
  await query(
    `INSERT INTO tasks (lead_id, reason, due_date, status, kind)
     VALUES ($1, 'Ask for a Google review', ${IST_TODAY} + 3, 'pending', 'review_request')`,
    [leadId]
  );
  return true;
}

async function logActivity(leadId, type, content) {
  await query('INSERT INTO activities (lead_id, type, content) VALUES ($1, $2, $3)', [leadId, type, content]);
}

// The admin tapped "Send on WhatsApp" / "Send email".
export async function markRequestSent(leadId, channel) {
  await ensureReviewRequests();
  const { rows: reminders } = await query(
    `SELECT id FROM tasks WHERE lead_id = $1 AND kind = 'review_reminder' AND status = 'pending'`, [leadId]
  );
  const isReminder = reminders.length > 0;
  if (isReminder) {
    await query(`UPDATE tasks SET status = 'done', updated_at = now() WHERE id = ANY($1)`, [reminders.map((r) => r.id)]);
  } else {
    await query(
      `UPDATE tasks SET status = 'done', updated_at = now()
        WHERE lead_id = $1 AND kind = 'review_request' AND status = 'pending'`, [leadId]
    );
    const { rows: existing } = await query(
      `SELECT 1 FROM tasks WHERE lead_id = $1 AND kind = 'review_reminder'`, [leadId]
    );
    if (!existing.length) {
      await query(
        `INSERT INTO tasks (lead_id, reason, due_date, status, kind)
         VALUES ($1, 'Remind client about the Google review', ${IST_TODAY} + 7, 'pending', 'review_reminder')`,
        [leadId]
      );
    }
  }
  await query(
    `UPDATE leads SET review_status = 'asked', review_asked_at = now()
      WHERE id = $1 AND review_status IS DISTINCT FROM 'reviewed'`, [leadId]
  );
  await logActivity(leadId, channel === 'Email' ? 'Email' : 'WhatsApp',
    isReminder ? 'Sent Google review reminder' : 'Sent Google review request');
  return { stage: isReminder ? 'reminder' : 'request' };
}

// The client left a review: stop any pending asks.
export async function markReviewed(leadId) {
  await ensureReviewRequests();
  await query(`UPDATE leads SET review_status = 'reviewed', reviewed_at = now() WHERE id = $1`, [leadId]);
  await query(
    `UPDATE tasks SET status = 'skipped', updated_at = now()
      WHERE lead_id = $1 AND kind = ANY($2) AND status = 'pending'`, [leadId, REVIEW_TASK_KINDS]
  );
  await logActivity(leadId, 'Note', 'Client left a Google review');
}

// Every won client and where they are in the review journey.
export async function listReviewRequests() {
  await ensureReviewRequests();
  const { rows } = await query(
    `SELECT l.id, l.name, l.phone, l.email, l.review_status, l.review_asked_at, l.reviewed_at,
            (SELECT t.due_date::text FROM tasks t
              WHERE t.lead_id = l.id AND t.kind = ANY($1) AND t.status = 'pending'
              ORDER BY t.due_date LIMIT 1) AS next_due,
            (SELECT t.kind FROM tasks t
              WHERE t.lead_id = l.id AND t.kind = ANY($1) AND t.status = 'pending'
              ORDER BY t.due_date LIMIT 1) AS next_kind
       FROM leads l
      WHERE l.deleted_at IS NULL AND l.status = 'Won'
      ORDER BY (l.review_status = 'reviewed') NULLS FIRST, l.updated_at DESC NULLS LAST`,
    [REVIEW_TASK_KINDS]
  );
  return rows;
}
