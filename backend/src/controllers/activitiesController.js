import { query } from '../db/pool.js';
import { asyncHandler, validationError } from '../middleware/errorHandler.js';

const ACTIVITY_TYPES = new Set([
  'Call', 'WhatsApp', 'Email', 'Meeting', 'Note', 'Proposal', 'Follow-up', 'Status Change',
]);

export const listActivities = asyncHandler(async (req, res) => {
  const { lead_id } = req.query;
  if (!lead_id) throw validationError('lead_id is required.');

  const { rows } = await query(
    'SELECT * FROM activities WHERE lead_id = $1 ORDER BY created_at DESC',
    [lead_id]
  );
  res.json({ activities: rows });
});

export const createActivity = asyncHandler(async (req, res) => {
  const { lead_id, type, content } = req.body;

  if (!lead_id || !type) throw validationError('lead_id and type are required.');
  if (!ACTIVITY_TYPES.has(type)) {
    throw validationError(`type must be one of: ${[...ACTIVITY_TYPES].join(', ')}`);
  }

  const { rows } = await query(
    'INSERT INTO activities (lead_id, type, content) VALUES ($1, $2, $3) RETURNING *',
    [lead_id, type, content || null]
  );
  res.status(201).json({ activity: rows[0] });
});
