// Local development entry point — starts a real HTTP server.
// In production (Vercel), api/index.js imports the app directly instead of this file,
// since Vercel's own runtime provides the HTTP server for serverless functions.
import app from './app.js';

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`SBC Growth Engine API listening on port ${port}`);
});
