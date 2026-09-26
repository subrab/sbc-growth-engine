import { asyncHandler, validationError } from '../middleware/errorHandler.js';
import { query } from '../db/pool.js';
import {
  getSettings, saveSettings, markRequestSent, markReviewed, listReviewRequests, SETTING_KEYS,
} from '../services/reviewRequests.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireLead(id, res) {
  if (!UUID_RE.test(id)) { res.status(404).json({ error: 'That lead could not be found.' }); return false; }
  const { rows } = await query('SELECT id FROM leads WHERE id = $1 AND deleted_at IS NULL', [id]);
  if (!rows[0]) { res.status(404).json({ error: 'That lead could not be found.' }); return false; }
  return true;
}

// GET /api/settings
export const readSettings = asyncHandler(async (req, res) => {
  res.json({ settings: await getSettings() });
});

// PUT /api/settings
export const updateSettings = asyncHandler(async (req, res) => {
  const values = {};
  for (const key of SETTING_KEYS) if (typeof req.body[key] === 'string') values[key] = req.body[key].trim();
  if (values.google_review_link && !/^https:\/\/\S+$/i.test(values.google_review_link)) {
    throw validationError('The Google review link should start with https:// (copy it from "Ask for reviews" in your Business Profile).');
  }
  res.json({ settings: await saveSettings(values) });
});

// POST /api/leads/:id/review-request/sent  { channel: 'WhatsApp' | 'Email' }
export const reviewRequestSent = asyncHandler(async (req, res) => {
  if (!(await requireLead(req.params.id, res))) return;
  res.json(await markRequestSent(req.params.id, req.body?.channel));
});

// POST /api/leads/:id/review-request/reviewed
export const reviewRequestReviewed = asyncHandler(async (req, res) => {
  if (!(await requireLead(req.params.id, res))) return;
  await markReviewed(req.params.id);
  res.json({ reviewed: true });
});

// GET /api/reviews/requests
export const getReviewRequests = asyncHandler(async (req, res) => {
  res.json({ clients: await listReviewRequests() });
});
