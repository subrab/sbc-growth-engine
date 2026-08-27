import rateLimit from 'express-rate-limit';

// Applied only to public, unauthenticated endpoints (lead capture, assessment) —
// authenticated /api/* routes don't need this since only the founder can reach them.
export const publicRateLimiter = rateLimit({
  windowMs: (Number(process.env.PUBLIC_RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000,
  max: Number(process.env.PUBLIC_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this connection. Please try again later.' },
});
