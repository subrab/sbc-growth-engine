// Shared JWT secret loader. Requires JWT_SECRET to be set as a real environment
// variable in Vercel (Project Settings → Environment Variables) or a local .env
// file for development — see .env.example. No hardcoded fallback, on purpose:
// a fallback secret checked into source is a security hole, not a convenience.
if (!process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is not set. Add it as an environment variable in Vercel Project Settings ' +
    '(or a local .env file for development) — see .env.example.'
  );
}

export const JWT_SECRET = process.env.JWT_SECRET;
