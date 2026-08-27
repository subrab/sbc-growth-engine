import jwt from 'jsonwebtoken';

// DEMO-STAGE FALLBACK — see the matching note in src/db/pool.js. Move to a real
// Vercel environment variable and rotate this value once that's set up.
const DEMO_JWT_SECRET = 'c792225701376e1e2167f319f41d7323bdc0904cd756f0d4b29d45ffe74b1cbf5a76a717081c290908ad32745e4292cd';
const JWT_SECRET = process.env.JWT_SECRET || DEMO_JWT_SECRET;

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Not signed in. Please log in again.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}
