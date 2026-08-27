import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';
import { asyncHandler, validationError } from '../middleware/errorHandler.js';

// DEMO-STAGE FALLBACK — see the matching note in src/db/pool.js and src/middleware/auth.js.
const DEMO_JWT_SECRET = 'c792225701376e1e2167f319f41d7323bdc0904cd756f0d4b29d45ffe74b1cbf5a76a717081c290908ad32745e4292cd';
const JWT_SECRET = process.env.JWT_SECRET || DEMO_JWT_SECRET;

// No public signup route exists on purpose — the single founder account is created via
// scripts/seedUser.js. This keeps the private app genuinely single-operator, per the spec.
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw validationError('Email and password are both required.');
  }

  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  const user = rows[0];

  if (!user) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});
