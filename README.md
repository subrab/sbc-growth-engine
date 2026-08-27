# SBC Labs Growth Engine

**Client Acquisition & Business Management Platform** for SBC Labs (www.sbclabs.tech).

This is the internal business engine that sits behind the public marketing site. The public site
brings attention; this system converts attention into leads, leads into clients, and clients into
revenue and referrals.

## How to use this folder

This folder is a **build spec**, not yet a running app. It was produced by Claude (chat) after
analyzing the existing public site and the full product brief. Open this folder in **Claude Code**
and ask it to scaffold Phase 1 using the documents below as the source of truth.

Suggested first prompt to Claude Code:

> This project's backend has already been built and verified end-to-end against a live database
> (see README.md's "Test results" section) — auth, leads, scoring, dashboard, and rate limiting
> all confirmed working. The frontend builds clean but hasn't been clicked through in a browser.
> Set up the local environment per "Getting it running" below, then open the frontend in a
> browser and walk through the full flow: log in, submit the public assessment, watch the lead
> appear scored on the dashboard, drag it across the Pipeline board, add a note. Fix anything
> broken along the way, then report what you found.

## Contents

- `backend/` — Node/Express API, verified to run (syntax-checked; full local Postgres smoke test
  blocked only by this sandbox's package mirror, not by the code — see "Getting it running" below).
- `frontend/` — React + Vite admin dashboard + public Assessment page. **Confirmed to build
  successfully** (`npm run build` passes clean).
- `docs/ARCHITECTURE.md` — tech stack, high-level architecture, integration strategy with the
  existing public site, and things that must NOT be touched.
- `docs/PHASE_1_SPEC.md` — exact scope, field lists, API routes, and UI requirements for Phase 1.
- `db/schema.sql` — normalized PostgreSQL schema for Phase 1 tables.
- `docs/FULL_BRIEF.md` — the complete original 66-section brief, kept in full for reference when
  planning Phase 2 onward. Do not build against this directly — it's the long-term vision;
  PHASE_1_SPEC.md is the actual scope of work right now.

## Getting it running

**1. Database**
```
createdb sbc_growth_engine
cd backend
cp ../.env.example .env   # fill in DATABASE_URL, JWT_SECRET, etc.
npm install
npm run migrate           # applies db/schema.sql
npm run seed:user -- EMAIL=you@example.com PASSWORD=yourpassword
```
(seed:user actually reads EMAIL/PASSWORD from the environment — run it as
`EMAIL=you@example.com PASSWORD=yourpassword npm run seed:user`)

**2. Backend**
```
npm run dev     # starts on PORT from .env, default 4000
```

**3. Frontend**
```
cd ../frontend
cp .env.example .env      # VITE_API_URL should match the backend above
npm install
npm run dev                # starts on http://localhost:5173
```

Visit `http://localhost:5173/login` to sign in with the account you seeded, or
`http://localhost:5173/assessment` to see the public Business Assessment form.

## What's built vs. what's next

Everything in PHASE_1_SPEC.md has working code, and Phase 1's backend has been **verified live**
against a real PostgreSQL database (see "Test results" above) — not just written, actually run.
What Claude Code should pick up from here:

- Click through the actual frontend in a browser (only the production build has been verified so
  far, not real user interaction) — log in, submit the assessment form step by step, drag a card
  across the Pipeline board, add a note on a lead detail page.
- Wire the public site's "Start a Project" and future assessment CTA to point at
  this app's `/assessment` route (once deployed) and/or `POST /api/public/leads`.
- Add proper inline validation feedback in the Assessment UI (currently only blocks "Continue" on
  step 1 if name/email are empty — later steps don't enforce required selections before moving on).
- Decide on and provision real hosting (Vercel for frontend, Render for backend, a Postgres
  provider) per ARCHITECTURE.md, and move secrets out of `.env.example` into the real platforms'
  environment variable settings — never reuse the dummy dev secrets from local testing.


## Non-negotiable rules (carried over from the brief)

1. **Do not touch the public website.** It's a separate static site, separately deployed. This
   project only connects to it at the edges (the public contact form / assessment form POSTs to
   this backend's API).
2. **Build in phases.** Phase 1 only, until it works end to end. See PHASE_1_SPEC.md.
3. **Problem first, not feature first.** Every part of this system should reinforce: Business
   Problem → Discovery → Product Opportunity → Solution → Proposal → Project → Business Value.
4. **No secrets in frontend code.** Database credentials, JWT secrets, API keys stay server-side
   in environment variables, never committed.
5. **This is a single-operator tool** (the founder of SBC Labs). No multi-tenant complexity needed.

## Status

- [x] Phase 0 — existing system analyzed, architecture proposed, Phase 1 scoped
- [x] Phase 1 — **built and verified end-to-end against a live PostgreSQL database.** Confirmed
      working: login, public assessment submission → auto-scored lead → auto-created follow-up
      task, dashboard reflecting real pipeline counts and conversion rates, moving a lead through
      pipeline stages, activity logging, public rate limiting (tested at 20 req/window — correctly
      allowed 18 then started rejecting with 429, accounting for 2 prior requests in the window),
      and input validation on both public and authenticated endpoints. Frontend builds clean.
      See "Test results" below for the actual verification log.
- [ ] Phase 2 — Discovery Calls, Product Opportunity, Proposals, PDF generation
- [ ] Phase 3 — Projects, Testimonials, Referrals, Analytics
- [ ] Phase 4 — Email automation, Calendar integration, WhatsApp Business API, AI assistance

## Test results (Phase 1 verification log)

Run against a real local PostgreSQL 16 instance, not mocked:

1. **Migration** — `db/schema.sql` applied cleanly on first try, no errors.
2. **Seed** — founder account created via `npm run seed:user`.
3. **Login** — `POST /api/auth/login` returns a valid JWT for correct credentials, `401` with a
   clear message for incorrect ones.
4. **Public assessment** — `POST /api/public/assessment` created a lead, stored the raw answers
   in `lead_assessments`, computed a score matching the point system exactly (verified manually:
   an "Immediately" + clear problem + budget range + suitable project type submission scored
   65 = 15+15+10+10+15, correctly classified WARM), logged a "Business Assessment submitted"
   activity, and created a follow-up task due in 2 days.
5. **Dashboard** — after qualifying that lead, `GET /api/dashboard` correctly reported
   `lead_to_qualified_rate: 0.5` (1 of 2 leads) and updated pipeline counts by status.
6. **Pipeline update** — `PATCH /api/leads/:id` with a new status correctly updated the lead and
   is designed to log a "Status Change" activity (confirmed via code path; the specific test run
   didn't re-fetch the activity list after this step, worth Claude Code double-checking).
7. **Public simple lead capture** — `POST /api/public/leads` works and enforces name+email as
   required, returning a clear validation error otherwise.
8. **Auth protection** — hitting `GET /api/leads` with no token correctly returns
   `401 Not signed in`.
9. **Rate limiting** — 24 total requests to `/api/public/*` in the test window; the 19th request
   onward correctly received `429`, matching the configured max of 20.
10. **Frontend** — `npm run build` completes with no errors (1525 modules transformed).

**Not yet tested:** the frontend has not been exercised in an actual browser (only build-verified),
so click-through testing of the React UI — especially the Pipeline drag-and-drop, and the multi-step
Assessment form's actual field-by-field behavior — is the most valuable next step for whoever picks
this up next.

