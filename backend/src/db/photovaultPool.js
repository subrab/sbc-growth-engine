import pg from 'pg';

// Read-only connection to the PhotoVault product database (separate Neon project).
// Optional: if PHOTOVAULT_DATABASE_URL is not set, the PhotoVault page shows a setup note
// instead of failing, and nothing else in the Growth Engine is affected.
const { Pool } = pg;

export const photovaultPool = process.env.PHOTOVAULT_DATABASE_URL
  ? new Pool({
      connectionString: process.env.PHOTOVAULT_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 2,
    })
  : null;

photovaultPool?.on('error', (err) => console.error('[photovaultPool] idle client error:', err.message));

export async function pvQuery(text, params) {
  if (!photovaultPool) throw new Error('PHOTOVAULT_DATABASE_URL is not set');
  const { rows } = await photovaultPool.query(text, params);
  return rows;
}
