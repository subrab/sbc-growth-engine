import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Add it as an environment variable in Vercel Project Settings ' +
    '(or a local .env file for development) — see .env.example.'
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon requires SSL. Set PGSSL=false in .env for local dev against a local Postgres.
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  // Idle client errors should never crash the whole process silently —
  // log loudly so it shows up wherever the backend's logs are watched.
  console.error('Unexpected error on idle Postgres client', err);
});

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  if (process.env.NODE_ENV !== 'production') {
    console.log('query', { text, duration: Date.now() - start, rows: res.rowCount });
  }
  return res;
}
