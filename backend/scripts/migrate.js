// Applies db/schema.sql against DATABASE_URL. Safe to re-run only on a fresh database —
// this is a straightforward "run the schema once" script for Phase 1, not a full migration
// framework. Introduce a real migration tool (e.g. node-pg-migrate) once the schema needs
// to evolve after data already exists in production.
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, '../../db/schema.sql');

async function main() {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  console.log(`Applying schema from ${schemaPath} ...`);
  await pool.query(sql);
  console.log('Schema applied successfully.');
  await pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
