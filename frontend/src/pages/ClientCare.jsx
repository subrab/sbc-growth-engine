import { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, Plus, ExternalLink, ChevronDown, ChevronUp, Pause, Play, Trash2, Pencil, Copy, Check } from 'lucide-react';
import { api } from '../api';

// Client Care: every client website, web app and mobile app SBC Labs maintains, with daily
// uptime, SSL, domain and security checks, plus visitor numbers from SBC Insights.

const API_BASE = (import.meta.env.VITE_API_URL || 'https://sbc-growth-engine-api.vercel.app/api').replace(/\/$/, '');
const KIND_LABEL = { website: 'Website', web_app: 'Web app', mobile_app: 'Mobile app' };
const PLANS = ['Basic', 'Standard', 'Premium'];

const STATUS = {
  healthy: { label: 'Healthy', dot: 'bg-green-500', pill: 'bg-green-100 text-green-800' },
  attention: { label: 'Needs attention', dot: 'bg-amber', pill: 'bg-amber/20 text-amber-900' },
  down: { label: 'Down', dot: 'bg-red-600', pill: 'bg-red-100 text-red-800' },
  pending: { label: 'Checking…', dot: 'bg-black/20', pill: 'bg-paper-2 text-ink-soft' },
  not_monitored: { label: 'No URL to monitor', dot: 'bg-black/20', pill: 'bg-paper-2 text-ink-soft' },
  paused: { label: 'Paused', dot: 'bg-black/20', pill: 'bg-paper-2 text-ink-soft' },
};

const daysUntil = (d) => (d ? Math.floor((new Date(d) - Date.now()) / 86400000) : null);
const grade = (s) => (s === null || s === undefined ? null : s >= 90 ? 'A' : s >= 75 ? 'B' : s >= 60 ? 'C' : s >= 40 ? 'D' : 'F');
const ago = (d) => {
  if (!d) return 'never';
  const m = Math.round((Date.now() - new Date(d)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
};
const snippet = (id) => `<script src="${API_BASE}/public/t.js" data-site="${id}" defer></script>`;

function Metric({ label, value, tone }) {
  const color = tone === 'bad' ? 'text-red-700' : tone === 'warn' ? 'text-amber-800' : 'text-ink';
  return (
    <div className="min-w-[88px]">
      <div className="text-[11px] uppercase tracking-wide text-ink-soft font-mono">{label}</div>
      <div className={`text-sm font-semibold ${color}`}>{value ?? '—'}</div>
    </div>
  );
}

function CopyButton({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button className="inline-flex items-center gap-1 text-xs font-medium text-blue-deep hover:underline"
      onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}>
      {done ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
    </button>
  );
}

const EMPTY = { client_name: '', name: '', kind: 'website', url: '', store_url: '', repo_url: '', plan: '', contract_end: '', notes: '', enable_tracking: true, tracking_id: '' };

function PropertyForm({ initial, onSaved, onCancel }) {
  const editing = !!initial?.id;
  const [f, setF] = useState(editing ? {
    ...EMPTY, ...Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, v ?? ''])),
    contract_end: initial.contract_end ? String(initial.contract_end).slice(0, 10) : '',
    tracking_id: initial.insights_site_id || '', enable_tracking: !!initial.insights_site_id,
  } : EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const isApp = f.kind === 'mobile_app';

  async function save() {
    setBusy(true); setError('');
    const payload = {
      client_name: f.client_name, name: f.name, kind: f.kind, url: f.url, store_url: f.store_url, repo_url: f.repo_url,
      plan: f.plan, contract_end: f.contract_end, notes: f.notes,
    };
    if (!isApp && f.enable_tracking) payload.tracking_id = f.tracking_id || f.name;
    else if (editing) payload.tracking_id = '';
    try {
      const { property } = editing ? await api.updateCare(initial.id, payload) : await api.createCare(payload);
      window.dispatchEvent(new Event('care-changed'));
      onSaved(property);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const input = 'w-full border border-black/10 rounded px-3 py-2 text-sm bg-white';
  const label = 'block text-xs font-semibold text-ink-soft mb-1';
  return (
    <div className="bg-white border border-black/10 rounded p-5 mb-6">
      <h2 className="font-display font-semibold mb-4">{editing ? `Edit ${initial.name}` : 'Add a client website or app'}</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div><label className={label}>Client name</label><input className={input} value={f.client_name} onChange={set('client_name')} placeholder="e.g. Annam Global" /></div>
        <div><label className={label}>Website / app name</label><input className={input} value={f.name} onChange={set('name')} placeholder="e.g. Main website" /></div>
        <div><label className={label}>Type</label>
          <select className={input} value={f.kind} onChange={set('kind')}>
            {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div><label className={label}>{isApp ? 'App server / API address (optional, monitored daily)' : 'Address to monitor'}</label>
          <input className={input} value={f.url} onChange={set('url')} placeholder={isApp ? 'https://api.clientapp.com/health' : 'https://clientsite.com'} /></div>
        {isApp && <div><label className={label}>App store link (optional)</label><input className={input} value={f.store_url} onChange={set('store_url')} placeholder="Play Store / App Store link" /></div>}
        <div><label className={label}>Code repository (optional)</label><input className={input} value={f.repo_url} onChange={set('repo_url')} placeholder="https://github.com/…" /></div>
        <div><label className={label}>Maintenance plan</label>
          <select className={input} value={f.plan} onChange={set('plan')}>
            <option value="">Not set</option>{PLANS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div><label className={label}>Contract ends</label><input type="date" className={input} value={f.contract_end} onChange={set('contract_end')} /></div>
        <div className="md:col-span-2"><label className={label}>Notes (hosting, logins location, special care…)</label><textarea rows={2} className={input} value={f.notes} onChange={set('notes')} /></div>
        {!isApp && (
          <label className="md:col-span-2 flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={f.enable_tracking} onChange={set('enable_tracking')} />
            <span>Count visitors with SBC Insights <span className="text-ink-soft">(you'll get a one-line code to add to the client's website)</span></span>
          </label>
        )}
      </div>
      {error && <div className="text-sm text-red-700 mt-3">{error}</div>}
      <div className="flex gap-3 mt-4">
        <button disabled={busy} onClick={save} className="bg-blue text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50">
          {busy ? (editing ? 'Saving…' : 'Adding and running first check…') : editing ? 'Save changes' : 'Add and check now'}
        </button>
        <button onClick={onCancel} className="text-sm text-ink-soft hover:text-ink">Cancel</button>
      </div>
    </div>
  );
}

function PropertyCard({ p, onChange, onEdit }) {
  const [open, setOpen] = useState(p.status === 'attention' || p.status === 'down');
  const [busy, setBusy] = useState('');
  const c = p.last_check;
  const st = STATUS[p.status] || STATUS.pending;
  const ssl = daysUntil(c?.ssl_expires_at);
  const dom = daysUntil(c?.domain_expires_at);
  const g = grade(c?.security_score);
  const contract = daysUntil(p.contract_end);

  async function act(kind) {
    setBusy(kind);
    try {
      if (kind === 'check') await api.runCareChecks(p.id);
      if (kind === 'pause') await api.updateCare(p.id, { active: !p.active });
      if (kind === 'delete') {
        if (!window.confirm(`Remove ${p.name} (${p.client_name}) from Client Care? Its check history is deleted; visitor data is kept.`)) return;
        await api.deleteCare(p.id);
      }
      window.dispatchEvent(new Event('care-changed'));
      onChange();
    } catch (e) { window.alert(e.message); } finally { setBusy(''); }
  }

  const btn = 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium border border-black/10 text-ink-soft hover:text-ink hover:bg-paper-2 disabled:opacity-50';
  return (
    <div className={`bg-white border rounded ${p.status === 'down' ? 'border-red-300' : p.status === 'attention' ? 'border-amber/60' : 'border-black/10'}`}>
      <div className="p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-start gap-3 min-w-[220px] flex-1">
          <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${st.dot}`} />
          <div className="min-w-0">
            <div className="font-medium">{p.name} <span className="text-ink-soft font-normal">· {p.client_name}</span></div>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
              <span className={`rounded-full px-2 py-0.5 font-medium ${st.pill}`}>{st.label}</span>
              <span className="text-ink-soft">{KIND_LABEL[p.kind]}{p.plan ? ` · ${p.plan} plan` : ''}</span>
              {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-blue-deep hover:underline inline-flex items-center gap-0.5">{new URL(p.url).host}<ExternalLink size={11} /></a>}
            </div>
          </div>
        </div>
        {p.url && p.active && (
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Metric label="Uptime 30d" value={p.up_ratio_30d === null ? null : `${Math.round(p.up_ratio_30d * 1000) / 10}%`} tone={p.up_ratio_30d !== null && p.up_ratio_30d < 0.99 ? 'warn' : null} />
            <Metric label="Response" value={c?.response_ms != null ? `${c.response_ms} ms` : null} tone={c?.response_ms > 3000 ? 'warn' : null} />
            <Metric label="SSL" value={ssl === null ? null : ssl < 0 ? 'Expired' : `${ssl} days`} tone={ssl !== null && ssl < 21 ? 'bad' : null} />
            <Metric label="Domain" value={dom === null ? null : dom < 0 ? 'Expired' : `${dom} days`} tone={dom !== null && dom < 30 ? 'bad' : null} />
            <Metric label="Security" value={g ? `${g} · ${c.security_score}` : null} tone={g === 'F' || g === 'D' ? 'bad' : g === 'C' ? 'warn' : null} />
            {p.insights_site_id && <Metric label="Visitors 7d" value={p.visitors_7d ?? 0} />}
          </div>
        )}
        <button onClick={() => setOpen(!open)} className="text-ink-soft hover:text-ink" aria-label={open ? 'Hide details' : 'Show details'}>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {p.problems.length > 0 && (
        <div className="px-4 pb-3 -mt-1 flex flex-wrap gap-2">
          {p.problems.map((x) => <span key={x} className="text-xs bg-red-50 text-red-800 border border-red-200 rounded px-2 py-1">{x}</span>)}
        </div>
      )}

      {open && (
        <div className="border-t border-black/5 p-4 grid lg:grid-cols-2 gap-6 text-sm">
          <div>
            <div className="font-semibold mb-2">Security checks {c && <span className="font-normal text-ink-soft text-xs">· last checked {ago(c.checked_at)}</span>}</div>
            {!p.url ? <p className="text-ink-soft">Add the app's server/API address to monitor it daily. App crashes and store ratings come in Phase 2.</p>
              : !c?.findings ? <p className="text-ink-soft">{c?.error ? `Couldn't reach the site: ${c.error}` : 'No results yet.'}</p>
              : (
                <ul className="space-y-1.5">
                  {c.findings.map((fd) => (
                    <li key={fd.key} className="flex gap-2">
                      <span className={fd.level === 'ok' ? 'text-green-700' : fd.level === 'critical' ? 'text-red-700' : fd.level === 'warning' ? 'text-amber-800' : 'text-ink-soft'}>
                        {fd.level === 'ok' ? '✓' : fd.level === 'critical' ? '✕' : '!'}
                      </span>
                      <span className={fd.level === 'ok' ? 'text-ink-soft' : ''}>{fd.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            <p className="text-xs text-ink-soft mt-3">A basic hygiene scan, not a penetration test. For high-risk clients, plan a professional security test once a year.</p>
          </div>
          <div className="space-y-4">
            {p.insights_site_id && (
              <div>
                <div className="font-semibold mb-1">Visitor tracking</div>
                <p className="text-ink-soft text-xs mb-2">Add this one line just before <code>&lt;/body&gt;</code> on the client's website. Visits appear in Insights under “{p.insights_site_id}”.</p>
                <div className="bg-paper-2 rounded p-2 font-mono text-[11px] break-all">{snippet(p.insights_site_id)}</div>
                <div className="mt-1"><CopyButton text={snippet(p.insights_site_id)} /></div>
              </div>
            )}
            <div className="text-xs text-ink-soft space-y-1">
              {p.contract_end && <div>Contract ends {new Date(p.contract_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}{contract !== null && contract < 45 ? <b className="text-amber-800"> · renewal due in {contract} days</b> : ''}</div>}
              {p.store_url && <div><a className="text-blue-deep hover:underline" href={p.store_url} target="_blank" rel="noopener noreferrer">App store listing</a></div>}
              {p.repo_url && <div><a className="text-blue-deep hover:underline" href={p.repo_url} target="_blank" rel="noopener noreferrer">Code repository</a> · turn on Dependabot alerts there to hear about vulnerable libraries</div>}
              {p.notes && <div className="whitespace-pre-line">{p.notes}</div>}
            </div>
            <div className="flex flex-wrap gap-2">
              {p.url && p.active && <button disabled={!!busy} onClick={() => act('check')} className={btn}><RefreshCw size={13} className={busy === 'check' ? 'animate-spin' : ''} /> Check now</button>}
              <button disabled={!!busy} onClick={() => onEdit(p)} className={btn}><Pencil size={13} /> Edit</button>
              <button disabled={!!busy} onClick={() => act('pause')} className={btn}>{p.active ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Resume</>}</button>
              <button disabled={!!busy} onClick={() => act('delete')} className={`${btn} hover:text-red-700`}><Trash2 size={13} /> Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ClientCare() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null); // null | 'new' | property
  const [running, setRunning] = useState(false);

  const load = () => api.getCare().then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function runAll() {
    setRunning(true);
    try { await api.runCareChecks(); await load(); window.dispatchEvent(new Event('care-changed')); }
    catch (e) { setError(e.message); } finally { setRunning(false); }
  }

  if (error && !data) return <div className="p-8 text-red-700">{error}</div>;
  if (!data) return <div className="p-8 text-ink-soft">Loading…</div>;
  const { properties, summary } = data;

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
        <div>
          <h1 className="font-display font-bold text-2xl flex items-center gap-2"><ShieldCheck size={24} /> Client Care</h1>
          <p className="text-ink-soft text-sm mt-1">
            Every client website and app you maintain. Checked automatically every morning (uptime, SSL, domain, security),
            with a WhatsApp alert if anything needs attention.
          </p>
        </div>
        <div className="flex gap-2">
          {properties.length > 0 && (
            <button disabled={running} onClick={runAll} className="inline-flex items-center gap-1.5 border border-black/10 bg-white text-sm font-medium px-3 py-2 rounded hover:bg-paper-2 disabled:opacity-50">
              <RefreshCw size={15} className={running ? 'animate-spin' : ''} /> {running ? 'Checking all…' : 'Run all checks'}
            </button>
          )}
          <button onClick={() => setForm('new')} className="inline-flex items-center gap-1.5 bg-blue text-white text-sm font-medium px-3 py-2 rounded">
            <Plus size={15} /> Add website or app
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
        {[
          ['Monitored', summary.total],
          ['Healthy', summary.healthy],
          ['Need attention', summary.attention],
          ['Last checked', ago(summary.last_checked)],
        ].map(([k, v], i) => (
          <div key={k} className={`bg-white border rounded p-4 ${i === 2 && summary.attention ? 'border-red-300' : 'border-black/10'}`}>
            <div className="text-xs text-ink-soft">{k}</div>
            <div className={`font-display font-bold text-2xl ${i === 2 && summary.attention ? 'text-red-700' : ''}`}>{v}</div>
          </div>
        ))}
      </div>

      {form && (
        <PropertyForm initial={form === 'new' ? null : form}
          onSaved={() => { setForm(null); load(); }} onCancel={() => setForm(null)} />
      )}

      {properties.length === 0 ? (
        <div className="bg-white border border-black/10 rounded p-8 text-center">
          <ShieldCheck size={32} className="mx-auto text-ink-soft mb-3" />
          <div className="font-medium mb-1">No client websites or apps yet</div>
          <p className="text-sm text-ink-soft mb-4">Add the first one, for example sbclabs.tech itself, and it will be checked straight away.</p>
          <button onClick={() => setForm('new')} className="bg-blue text-white text-sm font-medium px-4 py-2 rounded">Add website or app</button>
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map((p) => <PropertyCard key={p.id} p={p} onChange={load} onEdit={(x) => { setForm(x); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />)}
        </div>
      )}
    </div>
  );
}
