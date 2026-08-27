# Architecture

## Existing system (do not modify)

- **Public site:** `www.sbclabs.tech` — a single static `index.html` file (no framework, no build
  step), deployed on Vercel (project `sbc-website`). All CSS/JS is inline in that one file.
- **Current lead capture:** the contact form on the public site POSTs directly to Web3Forms
  (third-party), which emails the founder. Nothing is stored in a database today — every existing
  "lead" only exists as an email in an inbox.
- **No existing backend, no existing database.** This is a greenfield build for the Growth Engine.

**Integration strategy:** keep the public site and the Growth Engine as two separate projects with
two separate deployments. Connect them only by pointing the public site's forms (contact form, and
new CTAs like "Free Assessment") at this project's public API endpoints, in addition to or instead
of Web3Forms. Never bring the static site into this repo, and never let this project's deploy
process touch the public site's Vercel project.

## New system — tech stack

- **Frontend:** React + Vite, Tailwind CSS, React Router, Framer Motion (for the admin UI),
  Lucide React (icons)
- **Backend:** Node.js + Express, REST API
- **Database:** PostgreSQL
- **Auth:** JWT or secure session-based auth (single operator — see PHASE_1_SPEC.md)
- **Deployment (suggested, confirm with founder before provisioning):**
  - Frontend → Vercel (separate project from the public site)
  - Backend → Render
  - Database → managed Postgres (e.g. Neon, Supabase, or Render Postgres)

## High-level structure

```
PUBLIC (unauthenticated)
  - Public marketing site (untouched, separate repo/deploy)
  - Public Business Assessment form → POST /api/public/assessment
  - Public "Start a Project" / "Book a Discovery Call" CTAs → POST /api/public/leads

PRIVATE (authenticated — founder only)
  - /app or /admin — the Growth Engine dashboard
  - Dashboard, Leads, Pipeline, Contacts/Companies, Discovery Calls, Proposals,
    Projects, Follow-ups, Testimonials, Referrals, Analytics, Settings
```

## Repo layout (suggested)

```
sbc-growth-engine/
  frontend/          React + Vite app (the private dashboard)
  backend/           Node/Express API
    src/
      routes/
      controllers/
      models/
      middleware/    (auth, validation, error handling)
      db/            (migrations, connection pool)
  db/
    schema.sql       (source of truth for Phase 1 tables — see ../db/schema.sql in this spec)
  docs/
  .env.example       (documented, never committed with real values)
```

## Security baseline (non-negotiable, from the brief)

- Password hashing (bcrypt or equivalent)
- Protected routes on both frontend (route guards) and backend (auth middleware)
- Input validation on every API endpoint, including public ones
- Rate limiting on public endpoints (assessment/lead capture) to prevent spam/abuse
- No secrets in frontend bundles — all secrets via backend environment variables
- `created_at`/`updated_at` and an audit trail for sensitive actions (status changes, deletions)

## What Phase 1 explicitly does NOT include

Discovery calls, proposals, PDF generation, projects, testimonials, referrals, full analytics,
email automation, calendar integration, WhatsApp Business API, and any AI-assisted features. These
are Phase 2–4 per the brief and should not be started until Phase 1 is working end to end.
