import { useEffect, useState } from 'react';
import { Download, MonitorDown, Activity, Clock3, BadgeIndianRupee, Mail, MessageCircle } from 'lucide-react';
import { api } from '../api';

const RANGES = [7, 30, 90, 365];

const regionNames = (() => { try { return new Intl.DisplayNames(['en'], { type: 'region' }); } catch { return null; } })();
const countryName = (c) => { try { return (c && c.length === 2 && regionNames?.of(c)) || c || '—'; } catch { return c || '—'; } };
const rupees = (paise) => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const when = (t) => (t ? new Date(t).toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
}) : '—');

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

// Two series side by side per day: download sign-ups and app installs.
function DailyChart({ daily }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...daily.flatMap((d) => [d.signups, d.installs]));
  const W = 700, H = 170, pad = 24, bw = (W - pad * 2) / daily.length;
  const label = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const step = Math.ceil(daily.length / 7);
  return (
    <div className="bg-white border border-black/10 rounded p-5">
      <div className="flex flex-wrap justify-between items-baseline gap-2 mb-3">
        <h2 className="font-mono text-xs uppercase tracking-wide text-blue">Per day</h2>
        <div className="flex gap-4 text-xs text-ink-soft">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#3E63DD' }} /> Download sign-ups</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#E5A50A' }} /> App installs</span>
        </div>
      </div>
      <div className="text-xs text-ink-soft h-4 mb-1">
        {hover !== null && `${label(daily[hover].day)}: ${daily[hover].signups} sign-ups · ${daily[hover].installs} installs`}
      </div>
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" role="img" aria-label="Daily sign-ups and installs">
        <line x1={pad} x2={W - pad} y1={H} y2={H} stroke="rgba(0,0,0,0.1)" />
        {daily.map((d, i) => {
          const x = pad + i * bw, half = bw * 0.36;
          const h1 = (d.signups / max) * (H - 16), h2 = (d.installs / max) * (H - 16);
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x} y={0} width={bw} height={H} fill={hover === i ? 'rgba(0,0,0,0.03)' : 'transparent'} />
              <rect x={x + bw * 0.12} y={H - h1} width={half} height={Math.max(h1, d.signups ? 2 : 0)} rx="1.5" fill="#3E63DD" />
              <rect x={x + bw * 0.14 + half} y={H - h2} width={half} height={Math.max(h2, d.installs ? 2 : 0)} rx="1.5" fill="#E5A50A" />
              {i % step === 0 && (
                <text x={x + bw / 2} y={H + 16} textAnchor="middle" fontSize="10" fill="#4A5062">{label(d.day)}</text>
              )}
            </g>
          );
        })}
        <text x={pad} y={10} fontSize="10" fill="#4A5062">{max}</text>
      </svg>
    </div>
  );
}

function BarList({ title, rows }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="bg-white border border-black/10 rounded p-5">
      <h2 className="font-mono text-xs uppercase tracking-wide text-blue mb-4">{title}</h2>
      {rows.length === 0 ? <div className="text-sm text-ink-soft">No installs yet.</div> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="flex justify-between text-sm"><span>{r.label}</span><span className="font-mono">{r.n}</span></div>
              <div className="h-1.5 bg-black/5 rounded mt-1"><div className="h-1.5 bg-blue rounded" style={{ width: `${(r.n / max) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stage({ p }) {
  if (p.paid_at) return <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-green-100 text-green-800">Paid</span>;
  if (p.plan && p.plan !== 'free') return <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-amber/30 text-navy">{p.plan}</span>;
  if (p.installed_at) return <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-blue/10 text-blue">Installed</span>;
  return <span className="text-xs rounded-full px-2 py-0.5 bg-black/5 text-ink-soft">Signed up</span>;
}

export function PhotoVault() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    api.getPhotoVault(days).then(setData).catch((e) => setError(e.message));
  }, [days]);

  if (error) return <div className="p-8 text-red-700">{error}</div>;
  if (!data) return <div className="p-8 text-ink-soft">Loading…</div>;
  if (!data.configured) {
    return (
      <div className="p-8 max-w-3xl">
        <h1 className="font-display font-bold text-2xl">PhotoVault</h1>
        <p className="text-ink-soft mt-2">The PhotoVault database connection is not set up yet (PHOTOVAULT_DATABASE_URL).</p>
      </div>
    );
  }

  const { kpis, daily, people, versions, systems } = data;
  const rate = kpis.signups ? Math.round((kpis.installs / kpis.signups) * 100) : null;

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl">PhotoVault</h1>
          <p className="text-ink-soft text-sm mt-1">
            Downloads from photovault.sbclabs.tech, read live from the PhotoVault database.
          </p>
        </div>
        <div className="flex gap-1 bg-white border border-black/10 rounded p-1">
          {RANGES.map((r) => (
            <button key={r} onClick={() => setDays(r)}
              className={`px-3 py-1.5 text-sm rounded ${days === r ? 'bg-navy text-white' : 'text-ink-soft hover:bg-black/5'}`}>
              {r === 365 ? '1 year' : `${r} days`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Kpi icon={Download} label="Download sign-ups" value={kpis.signups} hint={`${kpis.signups_all} all time`} />
        <Kpi icon={MonitorDown} label="App installs" value={kpis.installs}
          hint={rate !== null ? `${rate}% of sign-ups · ${kpis.installs_all} all time` : `${kpis.installs_all} all time`} />
        <Kpi icon={Activity} label="Active now" value={kpis.active_installs} hint={`opened in last ${data.activeDays} days`} />
        <Kpi icon={Clock3} label="Trials started" value={kpis.trials} />
        <Kpi icon={BadgeIndianRupee} label="Paid" value={kpis.paid}
          hint={`${rupees(kpis.revenue_paise)} · ${rupees(kpis.revenue_all_paise)} all time`} />
      </div>

      <div className="mb-6"><DailyChart daily={daily} /></div>

      <div className="bg-white border border-black/10 rounded mb-6 overflow-x-auto">
        <div className="p-5 pb-3 flex justify-between items-baseline">
          <h2 className="font-mono text-xs uppercase tracking-wide text-blue">Who downloaded</h2>
          <span className="text-xs text-ink-soft">{people.length} in this period</span>
        </div>
        {people.length === 0 ? (
          <div className="px-5 pb-5 text-sm text-ink-soft">No download sign-ups in this period yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-mono uppercase tracking-wide text-ink-soft border-t border-black/10">
                <th className="px-5 py-2">Name</th><th className="px-3 py-2">Contact</th><th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Signed up</th><th className="px-3 py-2">Stage</th><th className="px-3 py-2">Marketing OK</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.email} className="border-t border-black/5 align-top">
                  <td className="px-5 py-2.5 font-medium">{p.name || '—'}</td>
                  <td className="px-3 py-2.5">
                    <a href={`mailto:${p.email}`} className="text-blue hover:underline block">{p.email}</a>
                    {p.phone && <span className="text-ink-soft text-xs">{p.phone}</span>}
                  </td>
                  <td className="px-3 py-2.5">{countryName(p.country)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{when(p.created_at)}</td>
                  <td className="px-3 py-2.5">
                    <Stage p={p} />
                    {p.version && <div className="text-xs text-ink-soft mt-1">v{p.version} · {p.os}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-ink-soft">
                    <span className="inline-flex gap-2">
                      {p.marketing_email && <Mail size={15} aria-label="Email OK" />}
                      {p.marketing_whatsapp && <MessageCircle size={15} aria-label="WhatsApp OK" />}
                      {!p.marketing_email && !p.marketing_whatsapp && '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="px-5 py-3 text-xs text-ink-soft border-t border-black/5">
          "Installed" appears only when the app reports the same email. Free installs are counted in the totals above even when they can't be matched to a person.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <BarList title="Installs by app version" rows={versions} />
        <BarList title="Installs by system" rows={systems} />
      </div>
    </div>
  );
}
