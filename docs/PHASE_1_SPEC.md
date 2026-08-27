# Phase 1 Specification

Goal of Phase 1: get a lead from "someone fills out a form" to "founder sees it, scores it,
moves it through a pipeline, and gets reminded to follow up" — end to end, working, before
anything else is built.

## 1. Auth

- Single user (the founder). No multi-tenant, no roles/permissions system needed yet.
- Secure login (hashed password), JWT or session-based, protected `/app` routes.
- No public signup — the one user account is created via a seed script or manual DB insert.

## 2. Dashboard (`/app` home)

Sections, top to bottom:

**Today**
- Follow-ups due today
- (Discovery calls / proposals sections appear once Phase 2 exists — omit for now)

**Pipeline**
- Count of leads per status: New, Contacted, Qualified, Discovery Scheduled, Discovery Completed,
  Negotiation, Won, Lost, Nurture
- Total pipeline value (sum of `estimated_project_value` for open leads)

**Business**
- Total leads (all time, and this month)
- Conversion rate: Lead → Qualified, Qualified → Won (simple ratios for now)

Keep it scannable in under 30 seconds — no more than these three blocks in Phase 1.

## 3. Leads module

**Fields** (from the brief, section 9):

Basic: name, company, email, phone, whatsapp, website, location, industry

Source (enum): Website, WhatsApp, Instagram, LinkedIn, Referral, Community, Networking Event,
Cold Email, Cold Outreach, Google, Existing Client, Other

Business info: company_size, business_type, current_digital_maturity, current_tools (text),
main_problem (text), desired_outcome (text)

Commercial: budget (range enum — see Assessment below), timeline (enum), decision_maker (bool or
text), urgency (enum), estimated_project_value (numeric, nullable)

Status (enum): New, Contacted, Responded, Qualified, Discovery Scheduled, Discovery Completed,
Proposal Sent, Negotiation, Won, Lost, Nurture
*(Proposal Sent only becomes reachable once Phase 2 proposals exist — leave in the enum now so the
schema doesn't need to change later, but the UI doesn't need to build proposal flows yet.)*

**Next Action** (required, free text or short enum: Call client / Send WhatsApp / Schedule
discovery / Follow up / Close / Nurture) — every lead must have one. Leads without a next action
should be visually flagged in the Leads list.

**Lead detail view** shows: Overview, Business info, Problem, Assessment answers (if from
assessment), Qualification (score/priority/budget/timeline/decision maker), Activity Timeline
(chronological, timestamped).

## 4. Public lead capture + Business Assessment

Two public, unauthenticated endpoints:

- `POST /api/public/leads` — simple lead capture (from "Start a Project" style CTAs). Minimal
  fields: name, email, phone, company, project type, description.
- `POST /api/public/assessment` — the full multi-step Business Assessment (brief section 11):
  About You (name, email, phone, company, website) → Business (industry, size, employees) →
  Current Situation (enum: Excel/Sheets/WhatsApp/Paper/Existing software/Multiple systems/Other)
  → Biggest Challenge (enum, multi-select allowed) → Desired Solution (enum) → Timeline (enum) →
  Budget (range enum: Below ₹25K / ₹25K–₹50K / ₹50K–₹1L / ₹1L–₹3L / ₹3L+ / Not sure) → free-text
  problem description.

Both endpoints: create a `lead` row (source = "Website" or "Website Assessment" as appropriate,
status = "New"), calculate the lead score (see below), store raw assessment answers in
`lead_assessments` if applicable, log a "Lead created" activity, and create a default follow-up
task. Respond with a simple thank-you message — no promised response time.

Rate-limit these endpoints (they're public and unauthenticated).

## 5. Lead scoring

Transparent, configurable point system (not AI, not a black box):

| Signal | Points |
|---|---|
| Budget clarity (gave a real range, not "Not sure") | +10 |
| Urgency (immediate/within 1 month) | +15 |
| Decision maker confirmed | +15 |
| Clear business problem described | +15 |
| Defined timeline | +10 |
| Suitable project type (matches SBC's services) | +15 |
| High business impact (founder's manual judgment call initially, or leave 0 until reviewed) | +20 |

Max 100. Classification: 80–100 HOT 🔥 / 60–79 WARM 🟡 / 40–59 NURTURE 🔵 / 0–39 LOW ⚪.

Store the score and its component breakdown in `lead_scores` so scoring logic can change later
without losing history. Scoring rules themselves should live in a config table or config file,
not hard-coded, so they can be tuned later per section 30 of the brief (Settings).

## 6. Pipeline (Kanban)

Columns: New, Contacted, Qualified, Discovery, Proposal, Negotiation, Won, Lost (Discovery/
Proposal columns exist visually now even though those modules aren't built yet — leads just sit
there until Phase 2 adds the workflows behind them).

Each card: company, contact name, project type, lead score badge, estimated value, next action,
next follow-up date. Drag-and-drop between columns updates `status` and logs an activity. Show
total value per column.

## 7. Activity log

Every status change, note, or logged contact (call/WhatsApp/email/meeting/note) creates a
timestamped `activities` row tied to a lead. Displayed as a simple chronological feed on the lead
detail page. No need for rich text — plain text notes are fine for Phase 1.

## 8. Follow-ups

`tasks` table: lead_id, reason, due_date, status (pending/done/skipped), notes.
Dashboard shows tasks due today. Actions: Complete, Reschedule, Skip, Add Note.
Default follow-up cadence after a new lead: +2 days (configurable later, hard-code for now).

## API summary (Phase 1)

```
POST   /api/auth/login
GET    /api/dashboard

GET    /api/leads
POST   /api/leads
GET    /api/leads/:id
PATCH  /api/leads/:id
DELETE /api/leads/:id            (soft delete preferred)

POST   /api/public/leads         (unauthenticated, rate-limited)
POST   /api/public/assessment    (unauthenticated, rate-limited)

GET    /api/activities?lead_id=
POST   /api/activities

GET    /api/tasks?due=today
POST   /api/tasks
PATCH  /api/tasks/:id
```

## Definition of done for Phase 1

- Founder can log in, see the dashboard, and immediately know what needs attention today.
- A stranger filling out the public assessment produces a real, scored lead in the system within
  seconds, with a follow-up task auto-created.
- Founder can move a lead through pipeline stages, log activities, and complete follow-ups,
  entirely through the UI, with no direct database access needed.
- No white screens; validation errors are user-friendly; nothing crashes on empty states (see
  brief section 52 — "No leads yet" empty state, not a blank screen).
