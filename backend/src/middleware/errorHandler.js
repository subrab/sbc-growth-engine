// Centralized error handling so no route ever lets an unhandled error crash silently
// or leak a raw stack trace to the client. Every response has a human-readable message.

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `No route matches ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.type === 'validation') {
    return res.status(400).json({ error: err.message, fields: err.fields || undefined });
  }

  if (err.code === '23505') {
    // Postgres unique_violation
    return res.status(409).json({ error: 'That record already exists.' });
  }

  res.status(err.status || 500).json({
    error: 'Something went wrong on our end. Please try again in a moment.',
  });
}

// Wraps an async route handler so thrown errors/rejected promises reach errorHandler
// instead of crashing the process — avoids needing try/catch in every controller.
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function validationError(message, fields) {
  const err = new Error(message);
  err.type = 'validation';
  err.fields = fields;
  return err;
}
