// Creates (or updates the password for) the single founder account.
// Run with: EMAIL=you@example.com PASSWORD=yourpassword npm run seed:user
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../src/db/pool.js';

async function main() {
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;
  const name = process.env.NAME || 'Founder';

  if (!email || !password) {
    console.error('Usage: EMAIL=you@example.com PASSWORD=yourpassword npm run seed:user');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [email.toLowerCase(), hash, name]
  );

  console.log(`User ready: ${email}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
