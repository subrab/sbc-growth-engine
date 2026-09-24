import { useEffect, useState } from 'react';
import { Users, Eye, Clock, Target, TrendingUp, Smartphone, Monitor, Tablet } from 'lucide-react';
import { api } from '../api';

const RANGES = [7, 30, 90];

// Friendly names for the website's section ids and tracked buttons.
const SECTION_NAMES = {
  home: 'Hero', services: 'Services', industries: 'Industries', problems: 'Problems we solve',
  about: 'About', process: 'How we work', 'case-studies': 'Case studies', reviews: 'Client reviews',
  why: 'Why SBC Labs', expertise: 'Tech expertise', engagement: 'Engagement models', contact: 'Contact',
};
const CLICK_NAMES = {
  cta_hero_build: "Hero: Let's Build Your Idea", cta_view_work: 'Hero: View Our Work',
  cta_nav_build: "Menu: Let's Build", cta_discuss: "Let's Discuss Your Idea", cta_discovery: 'Book a Discovery Call',
  whatsapp_float: 'WhatsApp button (floating)', whatsapp_contact: 'WhatsApp link (contact)',
  whatsapp_form: 'Continue on WhatsApp', email_link: 'Email link', leave_review: 'Leave a Review',
  exp_talk: 'Tech stack: Talk to us', industry_note: "Industries: Don't see yours?",
  review_submitted: 'Submitted a review',
  assessment_open_hero: 'Readiness check: opened from hero', assessment_open_industries: 'Readiness check: opened from Industries',
  assessment_open_contact: 'Readiness check: opened from Contact', assessment_completed: 'Readiness check: finished quiz',
  assessment_whatsapp: 'Readiness check: continued on WhatsApp',
  exit_offer_shown: 'Exit offer: shown', exit_offer_accept: 'Exit offer: accepted', exit_offer_dismiss: 'Exit offer: dismissed',
};
const clickName = (n) => (n?.startsWith('slide:') ? `Industry slide: ${n.slice(6)}` : CLICK_NAMES[n] || n);

const regionNames = (() => { try { return new Intl.DisplayNames(['en'], { type: 'region' }); } catch { return null; } })();
const countryName = (c) => { try { return (c && c.length === 2 && regionNames?.of(c)) || c; } catch { return c; } };

function formatDuration(s) {
  if (!s) return '0s';
  const m = Math.floor(s / 60);
  return m ? `${m}m ${s % 60}s` : `${s}s`;
}

function Kpi({ icon: Icon, label, value, hint }) {
  return (
    <div className="bg-white border border-black/10 rounded p-5">
      <div className="flex items-center gap-2 text-ink-soft text-xs font-mono uppercase tracking-wide mb-2">
        <Icon size={14} /> {label}
      </div>
      <div className="font-display font-bold text-2xl">{value}</div>
      {hint && <div className="text-xs text-ink-soft mt-1">{hint}</div>}
    </div>
  );
}

// Lightweight SVG bar chart, so the admin panel needs no charting library.
function DailyChart({ daily }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...daily.map((d) => d.visitors));
  const W = 700, H = 180, pad = 24, bw = (W - pad * 2) / daily.length;
  const label = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const step = Math.ceil(daily.length / 7);
  return (
    <div className="bg-white border border-black/10 rounded p-5">
      <div className="flex justify-between items-baseline mb-3">
        <h2 className="font-mono text-xs uppercase tracking-wide text-blue">Daily visitors</h2>
        <div className="text-xs text-ink-soft h-4">
          {hover !== null && `${label(daily[hover].day)}: ${daily[hover].visitors} visitors · ${daily[hover].pageviews} page views`}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" role="img" aria-label="Daily visitors chart">
        <line x1={pad} x2={W - pad} y1={H} y2={H} stroke="rgba(0,0,0,0.1)" />
        {daily.map((d, i) => {
          const h = (d.visitors / max) * (H - 16);
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad + i * bw} y={0} width={bw} height={H} fill="transparent" />
              <rect x={pad + i * bw + bw * 0.15} y={H - h} width={bw * 0.7} height={Math.max(h, d.visitors ? 2 : 0)}
                rx="2" fill={hover === i ? '#2947A3' : '#3E63DD'} />
              {i % step === 0 && (
                <text x={pad + i * bw + bw / 2} y={H + 16} textAnchor="middle" fontSize="10" fill="#4A5062">{label(d.day)}</text>
              )}
            </g>
          );
        })}
        <text x={pad} y={10} fontSize="10" fill="#4A5062">{max}</text>
      </svg>
    </div>
  );
}

function BarList({ title, rows, format = (x) => x, unit = 'visits', empty = 'No data yet.' }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="bg-white border border-black/10 rounded p-5">
      <h2 className="font-mono text-xs uppercase tracking-wide text-blue mb-4">{title}</h2>
      {rows.length === 0 ? (
        <div className="text-sm text-ink-soft">{empty}</div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="truncate pr-3">{format(r.label)}</span>
                <span className="font-mono text-xs text-ink-soft shrink-0">{r.n} {r.n === 1 ? unit.replace(/s$/, '') : unit}</span>
              </div>
              <div className="h-1.5 bg-paper-2 rounded">
                <div className="h-1.5 bg-blue rounded" style={{ width: `${(r.n / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Funnel({ f }) {
  const steps = [
    { label: 'Visited the site', n: f.visited },
    { label: 'Engaged (read 3+ sections, 30s+, or clicked)', n: f.engaged },
    { label: 'Started the enquiry form', n: f.form_started },
    { label: 'Sent an enquiry', n: f.form_submitted },
  ];
  const top = Math.max(1, f.visited);
  return (
    <div className="bg-white border border-black/10 rounded p-5">
      <h2 className="font-mono text-xs uppercase tracking-wide text-blue mb-4">Visitor journey</h2>
      <div className="space-y-3">
        {steps.map((s, i) => {
          const prev = i ? steps[i - 1].n : null;
          const drop = prev ? Math.round(((prev - s.n) / prev) * 100) : null;
          return (
            <div key={s.label}>
              <div className="flex justify-between text-sm mb-1">
                <span>{s.label}</span>
                <span className="font-mono text-xs">
                  <b>{s.n}</b>
                  <span className="text-ink-soft"> · {Math.round((s.n / top) * 100)}%</span>
                  {drop > 0 && <span className="text-red-700"> · −{drop}% from previous</span>}
                </span>
              </div>
              <div className="h-3 bg-paper-2 rounded">
                <div className="h-3 rounded bg-navy" style={{ width: `${(s.n / top) * 100}%`, opacity: 1 - i * 0.18 }} />
              </div>
            </div>
          );
        })}
      </div>
      {f.form_started > f.form_submitted && (
        <p className="text-xs text-ink-soft mt-4">
          {f.form_started - f.form_submitted} visitor{f.form_started - f.form_submitted === 1 ? '' : 's'} started the form but didn't send it.
          A shorter form or a WhatsApp nudge could recover some of these.
        </p>
      )}
    </div>
  );
}

export function Insights() {
  const [days, setDays] = useState(30);
  const [site, setSite] = useState('sbclabs');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    api.getInsights(site, days).then(setData).catch((e) => setError(e.message));
  }, [site, days]);

  if (error) return <div className="p-8 text-red-700">{error}</div>;
  if (!data) return <div className="p-8 text-ink-soft">Loading…</div>;

  const { kpis, funnel } = data;
  const deviceIcon = { Mobile: Smartphone, Desktop: Monitor, Tablet };
  const noData = funnel.visited === 0;

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl">Insights</h1>
          <p className="text-ink-soft text-sm mt-1">
            Anonymous visitor analytics. No cookies, no personal data. Visitors are counted once per day.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {data.sites.length > 1 && (
            <select value={site} onChange={(e) => setSite(e.target.value)}
              className="border border-black/10 rounded px-3 py-2 text-sm bg-white">
              {data.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          {RANGES.map((r) => (
            <button key={r} onClick={() => setDays(r)}
              className={`px-3 py-2 rounded text-sm font-medium border ${
                days === r ? 'bg-navy text-white border-navy' : 'bg-white border-black/10 text-ink-soft hover:text-ink'}`}>
              {r} days
            </button>
          ))}
        </div>
      </div>

      {noData && (
        <div className="bg-amber/10 border border-amber/40 rounded p-4 text-sm mb-6">
          No visits recorded in this period yet. Data starts appearing as soon as people visit {data.sites.find((s) => s.id === site)?.domain || 'the site'}.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Kpi icon={Users} label="Today" value={kpis.visitors_today} hint="visitors so far" />
        <Kpi icon={TrendingUp} label="Visitors" value={kpis.visitors} hint={`last ${days} days`} />
        <Kpi icon={Eye} label="Page views" value={kpis.pageviews} hint={`${kpis.sessions} visits`} />
        <Kpi icon={Clock} label="Avg. time" value={formatDuration(kpis.avg_seconds)} hint="per visit" />
        <Kpi icon={Target} label="Conversion" value={`${kpis.conversion_rate}%`}
          hint={kpis.leads !== null ? `${kpis.leads} website leads` : 'visits → enquiries'} />
      </div>

      <div className="mb-6"><DailyChart daily={data.daily} /></div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Funnel f={funnel} />
        <BarList title="Where visitors come from" rows={data.sources} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <BarList title="What they clicked" rows={data.clicks} format={clickName} unit="clicks" empty="No clicks recorded yet." />
        <BarList title="Sections they read" rows={data.sections} format={(n) => SECTION_NAMES[n] || n} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <BarList title="Devices" rows={data.devices}
          format={(d) => { const I = deviceIcon[d] || Monitor; return <span className="inline-flex items-center gap-2"><I size={14} /> {d}</span>; }} />
        <BarList title="Countries" rows={data.countries} format={countryName} />
      </div>
    </div>
  );
}
