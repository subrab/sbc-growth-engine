import { query } from '../db/pool.js';
import { asyncHandler, validationError } from '../middleware/errorHandler.js';

export const listTasks = asyncHandler(async (req, res) => {
  const { due } = req.query;
  let sql = `SELECT t.*, l.name AS lead_name FROM tasks t JOIN leads l ON l.id = t.lead_id WHERE t.status = 'pending'`;
  if (due === 'today') sql += ` AND t.due_date <= CURRENT_DATE`;
  sql += ' ORDER BY t.due_date ASC';

  const { rows } = await query(sql);
  res.json({ tasks: rows });
});

export const createTask = asyncHandler(async (req, res) => {
  const { lead_id, reason, due_date, notes } = req.body;
  if (!lead_id || !reason || !due_date) {
    throw validationError('lead_id, reason, and due_date are required.');
  }

  const { rows } = await query(
    'INSERT INTO tasks (lead_id, reason, due_date, notes) VALUES ($1, $2, $3, $4) RETURNING *',
    [lead_id, reason, due_date, notes || null]
  );
  res.status(201).json({ task: rows[0] });
});

// PATCH /api/tasks/:id — Complete / Reschedule / Skip / Add Note, per the brief's follow-up UI
export const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, due_date, notes } = req.body;

  const fields = [];
  const values = [];
  let i = 1;

  if (status !== undefined) { fields.push(`status = $${i++}`); values.push(status); }
  if (due_date !== undefined) { fields.push(`due_date = $${i++}`); values.push(due_date); }
  if (notes !== undefined) { fields.push(`notes = $${i++}`); values.push(notes); }

  if (!fields.length) throw validationError('Provide at least one field to update.');

  values.push(id);
  const { rows } = await query(
    `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  if (!rows[0]) return res.status(404).json({ error: 'That follow-up could not be found.' });
  res.json({ task: rows[0] });
});
