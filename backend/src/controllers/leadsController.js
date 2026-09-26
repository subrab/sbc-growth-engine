import { query } from '../db/pool.js';
import { asyncHandler, validationError } from '../middleware/errorHandler.js';
import { scoreLead } from '../utils/scoring.js';
import { scheduleReviewRequest } from '../services/reviewRequests.js';

const LEAD_FIELDS = [
  'company_id', 'contact_id', 'name', 'email', 'phone', 'whatsapp', 'website', 'location',
  'industry', 'source', 'company_size', 'business_type', 'current_digital_maturity',
  'current_tools', 'main_problem', 'desired_outcome', 'budget_range', 'timeline',
  'decision_maker', 'urgency', 'estimated_project_value', 'status', 'next_action',
  'next_follow_up_date',
];

function pickLeadFields(body) {
  const out = {};
  for (const key of LEAD_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

async function recordScore(leadId, leadRow) {
  const { score, priority, breakdown } = scoreLead(leadRow);
  await query(
    `INSERT INTO lead_scores (lead_id, score, priority, breakdown) VALUES ($1, $2, $3, $4)`,
    [leadId, score, priority, breakdown]
  );
  return { score, priority, breakdown };
}

async function logActivity(leadId, type, content) {
  await query(
    `INSERT INTO activities (lead_id, type, content) VALUES ($1, $2, $3)`,
    [leadId, type, content]
  );
}

// GET /api/leads — list, with optional filters. Flags leads missing next_action per brief §45.
export const listLeads = asyncHandler(async (req, res) => {
  const { status, source, priority } = req.query;
  const clauses = ['deleted_at IS NULL'];
  const params = [];

  if (status) {
    params.push(status);
    clauses.push(`status = $${params.length}`);
  }
  if (source) {
    params.push(source);
    clauses.push(`source = $${params.length}`);
  }

  const { rows: leads } = await query(
    `SELECT * FROM leads WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC`,
    params
  );

  // Attach latest score to each lead (small N in Phase 1 — fine to do per-row).
  const leadIds = leads.map((l) => l.id);
  let latestScores = {};
  if (leadIds.length) {
    const { rows: scoreRows } = await query(
      `SELECT DISTINCT ON (lead_id) lead_id, score, priority
       FROM lead_scores WHERE lead_id = ANY($1) ORDER BY lead_id, created_at DESC`,
      [leadIds]
    );
    latestScores = Object.fromEntries(scoreRows.map((s) => [s.lead_id, s]));
  }

  const enriched = leads
    .map((l) => ({
      ...l,
      score: latestScores[l.id]?.score ?? null,
      priority: latestScores[l.id]?.priority ?? null,
      missing_next_action: !l.next_action,
    }))
    .filter((l) => (priority ? l.priority === priority : true));

  res.json({ leads: enriched });
});

// GET /api/leads/:id — full detail: lead + assessment + score history + activities + tasks
export const getLead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { rows: leadRows } = await query(
    'SELECT * FROM leads WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  const lead = leadRows[0];
  if (!lead) return res.status(404).json({ error: 'That lead could not be found.' });

  const [{ rows: assessment }, { rows: scores }, { rows: activities }, { rows: tasks }] =
    await Promise.all([
      query('SELECT * FROM lead_assessments WHERE lead_id = $1', [id]),
      query('SELECT * FROM lead_scores WHERE lead_id = $1 ORDER BY created_at DESC', [id]),
      query('SELECT * FROM activities WHERE lead_id = $1 ORDER BY created_at DESC', [id]),
      query('SELECT * FROM tasks WHERE lead_id = $1 ORDER BY due_date ASC', [id]),
    ]);

  res.json({
    lead,
    assessment: assessment[0] || null,
    latest_score: scores[0] || null,
    score_history: scores,
    activities,
    tasks,
  });
});

// POST /api/leads — founder manually adds a lead (e.g. from networking, cold outreach)
export const createLead = asyncHandler(async (req, res) => {
  const fields = pickLeadFields(req.body);
  if (!fields.name) throw validationError('A name is required to create a lead.');

  const keys = Object.keys(fields);
  const values = Object.values(fields);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const { rows } = await query(
    `INSERT INTO leads (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  const lead = rows[0];

  await recordScore(lead.id, lead);
  await logActivity(lead.id, 'Note', 'Lead created manually.');

  res.status(201).json({ lead });
});

// PATCH /api/leads/:id — update any subset of fields; re-scores and logs status changes
export const updateLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const fields = pickLeadFields(req.body);
  if (Object.keys(fields).length === 0) {
    throw validationError('No valid fields were provided to update.');
  }

  const { rows: existingRows } = await query('SELECT * FROM leads WHERE id = $1', [id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: 'That lead could not be found.' });

  const keys = Object.keys(fields);
  const values = Object.values(fields);
  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');

  const { rows } = await query(
    `UPDATE leads SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  const lead = rows[0];

  if (fields.status && fields.status !== existing.status) {
    await logActivity(id, 'Status Change', `${existing.status} → ${fields.status}`);
    // Winning a client schedules a Google review request (never blocks the status update).
    if (fields.status === 'Won') await scheduleReviewRequest(id).catch((e) => console.error('review scheduling failed', e));
  }

  await recordScore(id, lead);

  res.json({ lead });
});

// DELETE /api/leads/:id — soft delete, per brief (never lose lead history outright)
export const deleteLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rows } = await query(
    'UPDATE leads SET deleted_at = now() WHERE id = $1 RETURNING id',
    [id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'That lead could not be found.' });
  res.json({ success: true });
});

export { recordScore, logActivity };
