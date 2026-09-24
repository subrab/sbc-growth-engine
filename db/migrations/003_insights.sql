-- Phase 1.2 — SBC Insights: privacy-friendly website analytics.
-- No cookies, no IP addresses, no personal data. Visitors are counted with a
-- daily-rotating one-way hash, so the same person cannot be followed across days.
-- Built for many websites from day one (site_id), so client sites can be added later.
-- Idempotent; the backend also applies this automatically on first use.

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
