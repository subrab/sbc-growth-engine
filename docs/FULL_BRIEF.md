# SBC Labs — Full Original Brief (all 66 sections, reference only)

This is the complete original brief for the SBC Labs Growth Engine, kept in full for planning
Phase 2 onward. **Do not build against this document directly** — `PHASE_1_SPEC.md` is the actual
current scope of work. Refer back here when Phase 1 is complete and it's time to scope Phase 2.

---

## 1. Business Objective

SBC Labs is a Product & Technology Studio. Core positioning: "From Ideas to Digital Products."
SBC Labs helps small/medium businesses, entrepreneurs, startups, professional service businesses,
and growing companies with: business websites, web applications, mobile applications, business
automation, custom software, MVP development, product strategy, product consulting, digital
transformation, and fractional Product Owner/Product Management support.

Primary objective: **acquire clients**. The system must help attract prospects, capture leads,
understand their business problem, qualify leads, prioritize leads, schedule discovery calls,
follow up, create proposals, track negotiations, convert leads into customers, track projects,
collect testimonials, generate referrals, and measure the entire sales funnel.

## 2. Important Principle

Not a generic CRM — built specifically for SBC Labs, reflecting a Product Owner mindset:

Business Problem → Discovery → Product Opportunity → Solution → Proposal → Project → Business Value

Sell solutions, not development hours.

## 3. System Name

"SBC Labs Growth Engine" — subtitle "Client Acquisition & Business Management Platform." Internal
only, never exposed publicly.

## 4. High-Level Architecture

Two logical areas: **Public** (existing site, unchanged except small CTA integrations) and
**Private** (secure internal app at `/admin` or `/app`, authenticated access only).

## 5. Existing Technology

Preferred stack: React/Vite/Tailwind/Framer Motion/Lucide/React Router (frontend), Node/Express
(backend), PostgreSQL (database), REST API, JWT or session auth. Analyze existing project before
changing architecture — do not blindly replace existing code.

## 6. First Action — Analyze Existing Project

Before implementing: inspect structure, frontend/backend architecture, routes, components,
styling, env vars, deployment config, database status, existing contact form. Produce an
"Existing System Analysis" covering architecture, reusable components, API routes, DB status,
integration strategy, risks, and files that should not be modified. *(This step is complete —
see ARCHITECTURE.md.)*

## 7. Core Modules

Dashboard, Leads, Business Assessment, Lead Qualification, Pipeline, Contacts & Companies,
Discovery Calls, Proposals, Projects, Follow-ups, Testimonials & Referrals, Analytics, Settings.

## 8. Dashboard

Answers "How is SBC Labs performing?" — lead metrics (total/new/qualified/hot/discovery
calls/proposals sent/negotiations/won/lost), revenue metrics (pipeline value/proposal
value/won revenue/expected revenue), conversion metrics (stage-to-stage %), activity (follow-ups
due, upcoming discovery calls, proposals awaiting response, overdue follow-ups, recent leads).
Should answer "what should I work on today?" without being overloaded.

## 9. Lead Management

Full field list: Lead ID, Name, Company, Email, Phone, WhatsApp, Website, Location, Industry.
Source enum (Website/WhatsApp/Instagram/LinkedIn/Referral/Community/Networking Event/Cold
Email/Cold Outreach/Google/Existing Client/Other). Business info (company size, business type,
digital maturity, current tools, main problem, desired outcome). Commercial info (budget,
timeline, decision maker, urgency, estimated project value). Status enum (New/Contacted/
Responded/Qualified/Discovery Scheduled/Discovery Completed/Proposal Sent/Negotiation/Won/
Lost/Nurture).

## 10. Lead Priority

Transparent scoring (not black-box AI): Budget clarity +10, Urgency +15, Decision maker +15,
Clear business problem +15, Defined timeline +10, Suitable project +15, High business impact +20.
Max 100. HOT 80-100 / WARM 60-79 / NURTURE 40-59 / LOW 0-39. Rules should be configurable later.

## 11. Business Assessment

Public-facing "Tell us about your business," ~2-3 minutes. Steps: About You (name/email/phone/
company/website) → Business (industry/size/employees) → Current Situation (Excel/Sheets/
WhatsApp/Paper/Existing software/Multiple/Other) → Biggest Challenge (getting customers/managing
customers/employees/payments/bookings/reporting/manual processes/communication/website/mobile
app/automation/other) → Desired Solution (website/web app/mobile app/automation/MVP/consulting/
not sure) → Timeline (immediately/1 month/1-3 months/3-6 months/exploring) → Budget ranges
(Below ₹25K/₹25K-₹50K/₹50K-₹1L/₹1L-₹3L/₹3L+/not sure) → free-text problem description.

## 12. After Assessment

Thank-you message (no promised response time). Auto-create lead (source = Website Assessment,
status = New), calculate score, store assessment responses, create follow-up task.

## 13. Admin Lead Detail

Overview, Business, Problem, Assessment (all answers), Qualification (score/priority/budget/
timeline/decision maker), Activity Timeline (timestamped: created, assessment submitted,
contacted, WhatsApp sent, call completed, proposal sent, follow-up, status changed).

## 14. Pipeline

Kanban columns: New, Contacted, Qualified, Discovery, Proposal, Negotiation, Won, Lost.
Drag-and-drop. Cards show company, contact, project type, lead score, estimated value, next
action, next follow-up date. Total value per stage.

## 15. Contacts and Companies

Separate Company and Contact entities; one company can have multiple contacts. Company fields:
name, industry, website, location, size, notes. Contact fields: name, role, email, phone,
whatsapp, linkedin.

## 16. Discovery Call Module

Fields: lead, date, time, meeting type, participants, agenda, business problem, current process,
desired outcome, pain points, constraints, budget, timeline, decision maker, notes, next step.
Structured discovery questions: What is the business trying to achieve? What problem exists
today? Who experiences it? How is it currently solved? What happens if unsolved? What does
success look like? Highest priority? What should NOT be built? Who decides? Expected timeline?

## 17. Product Opportunity

After discovery, define: Problem Statement, Target Users, Business Goal, Current Workflow,
Proposed Workflow, MVP Scope, Future Scope, Success Metrics, Risks. Key differentiator: don't
jump from "client wants an app" to "here's the price" — define the product opportunity first.

## 18. Proposal Module

Structure: Cover (SBC Labs, project title), Executive Summary, Current Situation, Proposed
Solution, Scope, Deliverables, Technology, Timeline, Investment, Payment Terms, Assumptions,
Out of Scope, Next Steps.

## 19. Proposal Status

Draft/Sent/Viewed/Negotiation/Accepted/Rejected/Expired. Track proposal date, expiry date,
amount, version. Never overwrite old versions — maintain history.

## 20. Proposal PDF

Professional branded PDF: SBC Labs, www.sbclabs.tech, letsbuild79@gmail.com, 9962453537. Clean
premium consulting/product-proposal look, not a generic invoice.

## 21. Follow-Up System

Configurable schedule (e.g. proposal sent → follow up in 2/5/10 days). Dashboard shows follow-ups
due today: client, reason, last contact, next action, phone, WhatsApp, email. Actions: Complete/
Reschedule/Skip/Add Note.

## 22. Communication Log

Activity types: Call, WhatsApp, Email, Meeting, Note, Proposal, Follow-up. Chronological client
history.

## 23. Project Conversion

Lead → WON → "Convert to Project" → auto-creates Client, Project, value, start date, expected
completion, scope, status. Pipeline: Lead → Client → Project.

## 24. Project Management

Not a full Jira replacement. Fields: project name, client, description, scope, budget, start
date, target date, status (Planning/Design/Development/Testing/Launch/Completed/On Hold).
Milestones allowed.

## 25. Testimonial Module

After project completion: request testimonial. Store client, company, role, testimonial, rating,
publish permission, photo, LinkedIn URL. Never auto-publish — require approval.

## 26. Referral Module

After delivery, ask for referrals. Track referrer, referred person, company, status (New/
Contacted/Qualified/Won/Lost), project value.

## 27. Analytics

Lead sources, conversion funnel (Leads→Qualified→Discovery→Proposal→Won), revenue (pipeline/
proposals/won), performance (best source/industry/service, average deal value, conversion rate).
Answers "where should SBC Labs spend its time?"

## 28. Service Analytics

Track by service category (Website/Web App/Mobile App/Automation/MVP/Product Consulting/Product
Management): leads, proposals, wins, revenue. Answers "what should SBC Labs sell more of?"

## 29. Industry Analytics

Track by industry (Catering/Finance/Education/Retail/Healthcare/Professional Services/Real
Estate/Startups/Other) — let actual data determine the best industries, don't assume.

## 30. Settings

Company info, logo, email, phone, WhatsApp, proposal defaults, payment terms, lead scoring rules,
pipeline stages, industries, services, budget ranges, timeline options — all configurable.

## 31. Authentication & Security

Secure auth, password hashing, protected routes, token/session management, input validation, API
authorization, rate limiting, secure env vars, no secrets in frontend, DB constraints, audit
logging for sensitive actions. Never expose DB credentials/JWT secrets/API keys/SMTP credentials
in frontend code.

## 32. Data Model

Normalized PostgreSQL schema. Tables: users, companies, contacts, leads, lead_assessments,
lead_scores, activities, tasks, discovery_calls, product_opportunities, proposals,
proposal_versions, projects, project_milestones, testimonials, referrals, services, industries,
settings. Foreign keys, created_at/updated_at, indexes on frequently searched fields. Don't
over-engineer.

## 33. Public Website Integration

Add CTAs to the existing site: "Start a Project" (primary), "Free Digital Business Assessment"
(secondary), "Book a Discovery Call" (third) — e.g. `/start-project`, `/assessment`, `/book-call`,
feeding into the acquisition system. Keep visual identity consistent.

## 34. Lead Capture

Every public enquiry enters the CRM with source tracked (website/assessment/whatsapp/linkedin/
referral) — essential for measuring marketing ROI.

## 35. Email

Architect for future transactional emails (assessment received, discovery confirmation, proposal
sent, follow-up reminder, project started/completed, testimonial request) via an abstraction
layer — don't hard-code a specific provider.

## 36. WhatsApp

Start with WhatsApp deep links (prefilled "Chat on WhatsApp" messages). Architect so the official
WhatsApp Business API can be added later. Don't build complex integration in V1.

## 37. Calendar

V1: simple discovery-call request (preferred date/time/timezone/meeting type). Architect for
future Google Calendar (or similar) integration. Don't build a complex calendar system yet.

## 38. User Experience

Single primary operator (the founder) — no unnecessary multi-tenant functionality. UI must be
fast, clean, professional, simple, data-driven. Dashboard understandable in under 30 seconds.

## 39. Mobile Responsiveness

Admin works on desktop/laptop/tablet/mobile; desktop is primary. Mobile optimized for checking
leads, calling/WhatsApp, updating status, completing follow-ups, viewing dashboard.

## 40. Design

SBC Labs branding: Product & Technology Studio, "From Ideas to Digital Products." Premium,
modern, minimal, professional. Avoid generic CRM look, excessive gradients/animation, crowded
dashboards.

## 41. Do Not Build Everything At Once — Phasing

**Phase 1 (MVP):** Auth, Dashboard, Leads, Public lead capture, Business assessment, Lead
scoring, Pipeline, Activities, Follow-ups.

**Phase 2:** Discovery Calls, Product Opportunity, Proposals, PDF generation.

**Phase 3:** Projects, Testimonials, Referrals, Analytics.

**Phase 4 (only when needed):** Email automation, Calendar integration, WhatsApp Business API,
Advanced analytics, AI-assisted lead analysis, AI proposal assistance.

## 42. AI — Future

Eventually AI can help with: lead analysis (problem/opportunity/urgency/solution/quality from an
assessment), discovery summary (call notes → problem/users/goals/requirements/MVP/risks),
proposal assistance (draft from discovery + opportunity + scope). AI suggestions always require
human review before reaching a client — never auto-send AI-generated communication.

## 43. Business Intelligence

The system should eventually answer: which business type generates the most leads, which service
converts best, which lead source produces the best customers, current pipeline value, proposals
awaiting follow-up, revenue this month, which industry to target next.

## 44. Dashboard Priority

Order: TODAY (follow-ups, discovery calls, proposals awaiting response) → PIPELINE (stage
counts) → BUSINESS (pipeline value, won revenue, conversion rate) → INSIGHTS (best source/
service/industry).

## 45. Business Rule — Next Action

Every lead must have a "Next Action" (call/WhatsApp/schedule discovery/prepare proposal/follow
up/close/nurture). Leads without one should be highlighted — prevents the CRM becoming a
graveyard of stale contacts.

## 46. Sales Philosophy

Problem first, not feature first: Business Problem → Business Impact → Desired Outcome → Product
Opportunity → Solution → Scope → Investment. Not: Technology → Features → Price.

## 47. Productized SBC Labs Offers

Configurable services (editable via Settings), starting examples: SBC Launch (Idea→MVP), SBC
Growth (Website→Lead Generation), SBC BusinessFlow (Manual→Digital Workflow), SBC Product Partner
(Product Strategy/Ownership).

## 48. CRM Search

Global search across company/contact/lead/phone/email/project. Filters: status, industry,
source, service, priority, date, value.

## 49. Export

CSV export for leads, contacts, companies, proposals, projects. Avoid exposing sensitive data
unnecessarily.

## 50. Backup / Data Safety

Database backups, data export, error logging, audit trail. The business should never be at risk
of total loss if the database is lost.

## 51. Error Handling

No white screens. Meaningful API error messages. User-friendly frontend errors. Secure backend
technical logging. Validate all forms.

## 52. Empty States

Useful, not blank. E.g. "No leads yet. Your first client starts here. Share your SBC Labs
assessment link or add your first prospect."

## 53. Demo Mode

Realistic seed/demo data for development (10 leads, 5 companies, 5 contacts, 3 proposals,
2 projects, several follow-ups) — clearly separated from production data.

## 54. Development Method

Work incrementally. Not thousands of lines in one response. Per phase: explain architecture →
identify files → implement → test → fix errors → continue. Run/build/test after each major
module. Never move forward with broken code.

## 55. Code Quality

Reusable components/API services, validation, error handling, clean naming, separation of
concerns, env vars, DB migrations, centralized config. Avoid massive components, hard-coded
business rules, duplicate code, secrets in source, inline SQL everywhere, unnecessary
dependencies.

## 56. Deployment

Public site keeps its existing deployment. For the Growth Engine: simplest compatible production
architecture — e.g. Frontend→Vercel, Backend→Render, Database→PostgreSQL provider. Inspect the
existing project first; don't migrate infrastructure without clear reason.

## 57. Environment Variables

Create `.env.example`, document required variables. Never commit `.env`, secrets, passwords, or
API keys.

## 58. SEO / Public Pages

Private dashboard needs no public SEO. Public assessment page should have appropriate title/
description/OpenGraph but avoid indexing private routes.

## 59. Privacy

Display a privacy notice. Don't collect unnecessary personal information. Don't expose leads
publicly. Restrict admin access. Don't send data to third-party AI services without explicit
configuration/consent. Follow reasonable data-protection practices.

## 60. Success Metrics

Acquisition (leads generated), Qualification (real opportunities), Sales (discovery calls/
proposals/wins), Revenue (pipeline/won), Efficiency (follow-up speed), Marketing (which channel
works), Business (which service/industry converts).

## 61. The Real Business Goal

Not "having a sophisticated CRM" — optimize for GETTING THE FIRST CLIENT, then THE SECOND CLIENT,
then BUILDING A REPEATABLE CLIENT ACQUISITION ENGINE. Every feature must support that.

## 62. First Client Strategy

Campaign: "SBC Labs — First 10 Clients." Track prospects from Personal Network, Community,
LinkedIn, Local Businesses, Referrals, Networking, Startup Community, Cold Outreach, Existing
Relationships. Campaign dashboard: Prospects → Contacted → Responded → Discovery → Proposal →
Won, with conversion rates.

## 63. Initial Target

Not thousands of leads. Initial objective: 100 qualified prospects → 20 meaningful conversations
→ 10 discovery calls → 3 proposals → 1-3 first clients. An experiment, not a guarantee — track
actual results.

## 64. Future Lead Generation

Architect so leads can eventually come from Website, LinkedIn, Instagram, WhatsApp, Email,
Referrals, Networking, Google Business, manual prospecting, advertising — but don't integrate
everything in V1. Start manually, measure, automate what proves useful.

## 65. Final Product Vision

"The operating system for SBC Labs" — eventually manages Leads → Sales → Clients → Projects →
Revenue → Relationships → Referrals. The public website brings attention; the Growth Engine
converts attention into business.

## 66. Start Now

Phase 0 (this analysis) is complete. Positioning: Product Thinking + Business Understanding +
Technology Execution → Leads → Clients → Projects → Revenue → Referrals.

