// Vercel serverless entry point. vercel.json rewrites every request path to this
// function, so the Express app inside sees the original path unchanged (e.g.
// /api/auth/login) and its existing route definitions match exactly as they do locally.
import app from '../src/app.js';

export default app;
