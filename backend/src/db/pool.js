import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// DEMO-STAGE FALLBACK: this hardcoded connection string is a live demo Neon database
// created for this session so the founder could see a working system immediately.
// There is currently no tool available to set real environment variables on this
// Vercel project, so the value is embedded here rather than left unset. Move this to
// a proper Vercel environment variable (Project Settings → Environment Variables) as
// soon as that's set up, and rotate the password at that point since it has been
// visible in this conversation and in source.
const DEMO_DATABASE_URL =
  'postgresql://neondb_owner:npg_pSwmlHOC2z7t@ep-noisy-frog-av11k1z1-pooler.c-11.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || DEMO_DATABASE_URL,
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
