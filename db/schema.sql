-- SBC Labs Growth Engine — Phase 1 schema
-- PostgreSQL. Run against a fresh database.

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- ---------- users (single operator in Phase 1, but built to allow more later) ----------
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- companies ----------
CREATE TABLE companies (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL,
    industry     TEXT,
    website      TEXT,
    location     TEXT,
    company_size TEXT,
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- contacts (a company can have many contacts) ----------
CREATE TABLE contacts (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    name       TEXT NOT NULL,
    role       TEXT,
    email      TEXT,
    phone      TEXT,
    whatsapp   TEXT,
    linkedin   TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- leads ----------
CREATE TYPE lead_source AS ENUM (
    'Website', 'Website Assessment', 'WhatsApp', 'Instagram', 'LinkedIn', 'Referral',
    'Community', 'Networking Event', 'Cold Email', 'Cold Outreach', 'Google',
    'Existing Client', 'Other'
);

CREATE TYPE lead_status AS ENUM (
    'New', 'Contacted', 'Responded', 'Qualified', 'Discovery Scheduled',
    'Discovery Completed', 'Proposal Sent', 'Negotiation', 'Won', 'Lost', 'Nurture'
);

CREATE TABLE leads (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id               UUID REFERENCES companies(id) ON DELETE SET NULL,
    contact_id               UUID REFERENCES contacts(id) ON DELETE SET NULL,

    -- basic (denormalized copies for fast display / for leads with no company/contact yet)
    name                     TEXT NOT NULL,
    email                    TEXT,
    phone                    TEXT,
    whatsapp                 TEXT,
    website                  TEXT,
    location                 TEXT,
    industry                 TEXT,

    source                   lead_source NOT NULL DEFAULT 'Other',

    -- business info
    company_size             TEXT,
    business_type            TEXT,
    current_digital_maturity TEXT,
    current_tools            TEXT,
    main_problem             TEXT,
    desired_outcome          TEXT,

    -- commercial
    budget_range             TEXT,          -- e.g. 'Below ₹25K', '₹25K–₹50K', ...
    timeline                 TEXT,          -- e.g. 'Immediately', 'Within 1 month', ...
    decision_maker           BOOLEAN,
    urgency                  TEXT,
    estimated_project_value  NUMERIC,

    status                   lead_status NOT NULL DEFAULT 'New',
    next_action              TEXT,          -- required in practice; enforced at app layer
    next_follow_up_date      DATE,

    deleted_at               TIMESTAMPTZ,   -- soft delete
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_status ON leads(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_next_follow_up ON leads(next_follow_up_date);

-- ---------- lead_assessments (raw answers from the public Business Assessment) ----------
CREATE TABLE lead_assessments (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id           UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    current_situation TEXT,   -- Excel / Sheets / WhatsApp / Paper / Existing software / Multiple / Other
    biggest_challenge TEXT,   -- stored as text; can be comma-separated if multi-select
    desired_solution  TEXT,
    raw_answers       JSONB,  -- full original submission, for anything not modeled above
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- lead_scores (history of scoring, not just current value) ----------
CREATE TABLE lead_scores (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    score      INTEGER NOT NULL,
    priority   TEXT NOT NULL,   -- HOT / WARM / NURTURE / LOW
    breakdown  JSONB,           -- { "budget_clarity": 10, "urgency": 15, ... }
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_scores_lead_id ON lead_scores(lead_id);

-- ---------- activities (timeline entries per lead) ----------
CREATE TYPE activity_type AS ENUM (
    'Call', 'WhatsApp', 'Email', 'Meeting', 'Note', 'Proposal', 'Follow-up', 'Status Change'
);

CREATE TABLE activities (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    type       activity_type NOT NULL,
    content    TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activities_lead_id ON activities(lead_id);

-- ---------- tasks (follow-ups) ----------
CREATE TYPE task_status AS ENUM ('pending', 'done', 'skipped');

CREATE TABLE tasks (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    reason     TEXT NOT NULL,
    due_date   DATE NOT NULL,
    status     task_status NOT NULL DEFAULT 'pending',
    notes      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE status = 'pending';

-- ---------- updated_at trigger helper (apply to all tables with updated_at) ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- reviews (added in Phase 1.1 — see db/migrations/002_reviews.sql) ----------
CREATE TABLE IF NOT EXISTS reviews (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL,
    company      TEXT,
    role         TEXT,
    email        TEXT,
    rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text  TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected')),
    reviewed_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_status_created ON reviews (status, created_at DESC);

-- ---------- SBC Insights analytics (added in Phase 1.2 — see db/migrations/003_insights.sql) ----------
CREATE TABLE IF NOT EXISTS analytics_sites (
    id          TEXT PRIMARY KEY,               -- short slug used by the tracking script, e.g. 'sbclabs'
    name        TEXT NOT NULL,
    domain      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_events (
    id           BIGSERIAL PRIMARY KEY,
    site_id      TEXT NOT NULL REFERENCES analytics_sites(id) ON DELETE CASCADE,
    visitor_hash TEXT NOT NULL,                 -- daily-rotating anonymous hash
    session_id   TEXT NOT NULL,                 -- random per browser tab, generated client-side
    event_type   TEXT NOT NULL CHECK (event_type IN ('pageview','section_view','click','form_start','form_submit','leave')),
    name         TEXT,                          -- section id, click target, or form name
    path         TEXT,
    source       TEXT,                          -- Google, WhatsApp, LinkedIn, Direct, ...
    referrer     TEXT,                          -- referring domain only, never the full URL
    device       TEXT,                          -- Mobile / Tablet / Desktop
    country      TEXT,
    value        INTEGER,                       -- seconds on page (leave) or scroll depth %
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_site_time ON analytics_events (site_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_session   ON analytics_events (site_id, session_id);

INSERT INTO analytics_sites (id, name, domain)
VALUES ('sbclabs', 'SBC Labs', 'www.sbclabs.tech')
ON CONFLICT (id) DO NOTHING;
