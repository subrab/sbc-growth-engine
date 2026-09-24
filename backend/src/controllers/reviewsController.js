import { query } from '../db/pool.js';
import { asyncHandler, validationError } from '../middleware/errorHandler.js';

const STATUSES = ['Pending', 'Approved', 'Rejected'];

// Creates the reviews table on first use, so this feature works on an existing
// database without a separate migration step. Idempotent and runs once per
// server instance. Same SQL as db/migrations/002_reviews.sql.
let tableReady = null;
function ensureReviewsTable() {
  if (!tableReady) {
    tableReady = (async () => {
      await query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
      await query(`
        CREATE TABLE IF NOT EXISTS reviews (
          id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name         TEXT NOT NULL,
          company      TEXT,
          role         TEXT,
          email        TEXT,
          rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
          review_text  TEXT NOT NULL,
          status       TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected')),
          reviewed_at  TIMESTAMPTZ,
          created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        )`);
      await query('CREATE INDEX IF NOT EXISTS idx_reviews_status_created ON reviews (status, created_at DESC)');
    })().catch((err) => {
      tableReady = null; // allow a retry on the next request
      throw err;
    });
  }
  return tableReady;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// ---------- Public (no login) ----------

// POST /api/public/reviews — anyone can submit; always saved as Pending.
export const submitReview = asyncHandler(async (req, res) => {
  await ensureReviewsTable();
  const { website_url } = req.body; // honeypot: real visitors never fill this hidden field

  if (website_url) {
    // Pretend success so bots don't learn they were filtered.
    return res.status(201).json({ message: 'Thank you! Your review has been submitted for approval.' });
  }

  const name = clean(req.body.name, 80);
  const company = clean(req.body.company, 120);
  const role = clean(req.body.role, 80);
  const email = clean(req.body.email, 160);
  const review_text = clean(req.body.review_text, 1200);
  const rating = Number(req.body.rating);

  if (!name) throw validationError('Please add your name.');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw validationError('Please choose a star rating from 1 to 5.');
  if (review_text.length < 10) throw validationError('Please write a few words about your experience (at least 10 characters).');

  await query(
    `INSERT INTO reviews (name, company, role, email, rating, review_text, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'Pending')`,
    [name, company || null, role || null, email || null, rating, review_text]
  );

  res.status(201).json({ message: 'Thank you! Your review has been submitted and will appear once approved.' });
});

// GET /api/public/reviews — only Approved reviews, never emails.
export const listApprovedReviews = asyncHandler(async (req, res) => {
  await ensureReviewsTable();
  const { rows } = await query(
    `SELECT id, name, company, role, rating, review_text, created_at
       FROM reviews
      WHERE status = 'Approved'
      ORDER BY reviewed_at DESC NULLS LAST, created_at DESC
      LIMIT 24`
  );
  const count = rows.length;
  const average = count ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : null;
  res.json({ reviews: rows, summary: { count, average } });
});

// ---------- Admin (login required) ----------

// GET /api/reviews?status=Pending
export const listReviews = asyncHandler(async (req, res) => {
  await ensureReviewsTable();
  const { status } = req.query;
  const params = [];
  let where = '';
  if (status && STATUSES.includes(status)) {
    params.push(status);
    where = 'WHERE status = $1';
  }
  const { rows } = await query(`SELECT * FROM reviews ${where} ORDER BY created_at DESC`, params);
  const { rows: counts } = await query('SELECT status, COUNT(*)::int AS n FROM reviews GROUP BY status');
  const summary = { Pending: 0, Approved: 0, Rejected: 0 };
  counts.forEach((c) => { summary[c.status] = c.n; });
  res.json({ reviews: rows, counts: summary });
});

// PATCH /api/reviews/:id  { status }
export const updateReviewStatus = asyncHandler(async (req, res) => {
  await ensureReviewsTable();
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Review not found.' });
  const { status } = req.body;
  if (!STATUSES.includes(status)) throw validationError('Status must be Pending, Approved or Rejected.');
  const { rows } = await query(
    `UPDATE reviews
        SET status = $1,
            reviewed_at = CASE WHEN $1 = 'Pending' THEN NULL ELSE now() END,
            updated_at = now()
      WHERE id = $2
      RETURNING *`,
    [status, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Review not found.' });
  res.json({ review: rows[0] });
});

// DELETE /api/reviews/:id
export const deleteReview = asyncHandler(async (req, res) => {
  await ensureReviewsTable();
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Review not found.' });
  const { rowCount } = await query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Review not found.' });
  res.json({ deleted: true });
});
