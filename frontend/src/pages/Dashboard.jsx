import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock } from 'lucide-react';
import { api } from '../api';
import { ReviewRequestActions } from '../components/ReviewRequestActions';

// Dates are compared as plain calendar days in India time.
const istToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const dayNum = (ymd) => { const [y, m, d] = ymd.slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d) / 86400000; };
const prettyDay = (ymd) => new Date(ymd.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const tomorrowIst = () => { const d = new Date(dayNum(istToday()) * 86400000 + 86400000); return d.toISOString().slice(0, 10); };

function TaskRow({ task, onChange }) {
  const [busy, setBusy] = useState(false);
  const late = dayNum(istToday()) - dayNum(task.due_date);
  async function update(payload) {
    setBusy(true);
    try { await api.updateTask(task.id, payload); onChange(); } finally { setBusy(false); }
  }
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-paper-2 transition-colors">
      <Link to={`/app/leads/${task.lead_id}`} className="min-w-0 flex-1">
        <div className="font-medium text-sm">{task.lead_name}</div>
        <div className="text-ink-soft text-xs">{task.reason}</div>
      </Link>
      <div className={`text-xs font-mono shrink-0 ${late > 0 ? 'text-red-700' : 'text-ink-soft'}`}>
        {late > 0 ? `${prettyDay(task.due_date)} · ${late} day${late === 1 ? '' : 's'} overdue` : 'Due today'}
      </div>
      {task.kind === 'review_request' || task.kind === 'review_reminder' ? (
        <div className="flex gap-1.5 shrink-0 items-center">
          <ReviewRequestActions compact onDone={onChange}
            stage={task.kind === 'review_reminder' ? 'reminder' : 'request'}
            lead={{ id: task.lead_id, name: task.lead_name, phone: task.lead_phone, email: task.lead_email }} />
          <button disabled={busy} onClick={() => update({ due_date: tomorrowIst() })} title="Move to tomorrow"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium border border-black/10 text-ink-soft hover:text-ink hover:bg-white disabled:opacity-50">
            <Clock size={13} /> Tomorrow
          </button>
        </div>
      ) : (
      <div className="flex gap-1.5 shrink-0">
        <button disabled={busy} onClick={() => update({ status: 'done' })} title="Mark as done"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
          <Check size={13} /> Done
        </button>
        <button disabled={busy} onClick={() => update({ due_date: tomorrowIst() })} title="Move to tomorrow"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium border border-black/10 text-ink-soft hover:text-ink hover:bg-white disabled:opacity-50">
          <Clock size={13} /> Tomorrow
        </button>
      </div>
      )}
    </div>
  );
}

const STATUS_ORDER = [
  'New', 'Contacted', 'Qualified', 'Discovery Scheduled', 'Discovery Completed',
  'Negotiation', 'Won', 'Lost', 'Nurture',
];

function currency(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}

export function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.getDashboard().then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  if (error) return <div className="p-8 text-red-700">{error}</div>;
  if (!data) return <div className="p-8 text-ink-soft">Loading…</div>;

  const { today, pipeline, business } = data;

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="font-display font-bold text-2xl mb-8">Dashboard</h1>

      {/* TODAY: follow-ups due today, with anything overdue listed first and clearly marked */}
      <section className="mb-10">
        <h2 className="font-mono text-xs uppercase tracking-wide text-blue mb-3">Today</h2>
        {(() => {
          const todayNum = dayNum(istToday());
          const overdue = today.follow_ups_due.filter((t) => dayNum(t.due_date) < todayNum);
          const dueToday = today.follow_ups_due.filter((t) => dayNum(t.due_date) >= todayNum);
          if (!overdue.length && !dueToday.length) {
            return (
              <div className="bg-white border border-black/10 rounded p-6 text-ink-soft text-sm">
                No follow-ups due today. Nothing urgent — good moment to reach out to a lead proactively.
              </div>
            );
          }
          return (
            <div className="space-y-4">
              {overdue.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-red-700 mb-2">Overdue · {overdue.length}</div>
                  <div className="bg-white border border-red-200 rounded divide-y divide-black/5">
                    {overdue.map((task) => <TaskRow key={task.id} task={task} onChange={load} />)}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs font-semibold text-ink-soft mb-2">Due today · {dueToday.length}</div>
                {dueToday.length ? (
                  <div className="bg-white border border-black/10 rounded divide-y divide-black/5">
                    {dueToday.map((task) => <TaskRow key={task.id} task={task} onChange={load} />)}
                  </div>
                ) : (
                  <div className="bg-white border border-black/10 rounded p-4 text-ink-soft text-sm">Nothing new due today.</div>
                )}
              </div>
            </div>
          );
        })()}
      </section>

      {/* PIPELINE */}
      <section className="mb-10">
        <h2 className="font-mono text-xs uppercase tracking-wide text-blue mb-3">Pipeline</h2>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-px bg-black/10 border border-black/10 rounded overflow-hidden mb-3">
          {STATUS_ORDER.map((status) => (
            <div key={status} className="bg-white p-4">
              <div className="text-2xl font-display font-semibold">{pipeline.by_status[status] ?? 0}</div>
              <div className="text-xs text-ink-soft mt-1">{status}</div>
            </div>
          ))}
        </div>
        <div className="text-sm text-ink-soft">
          Total open pipeline value: <span className="font-semibold text-ink">{currency(pipeline.total_pipeline_value)}</span>
        </div>
      </section>

      {/* BUSINESS */}
      <section>
        <h2 className="font-mono text-xs uppercase tracking-wide text-blue mb-3">Business</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-black/10 border border-black/10 rounded overflow-hidden">
          <div className="bg-white p-4">
            <div className="text-2xl font-display font-semibold">{business.total_leads_all_time}</div>
            <div className="text-xs text-ink-soft mt-1">Total leads (all time)</div>
          </div>
          <div className="bg-white p-4">
            <div className="text-2xl font-display font-semibold">{business.total_leads_this_month}</div>
            <div className="text-xs text-ink-soft mt-1">Leads this month</div>
          </div>
          <div className="bg-white p-4">
            <div className="text-2xl font-display font-semibold">{Math.round(business.lead_to_qualified_rate * 100)}%</div>
            <div className="text-xs text-ink-soft mt-1">Lead → Qualified</div>
          </div>
          <div className="bg-white p-4">
            <div className="text-2xl font-display font-semibold">{Math.round(business.qualified_to_won_rate * 100)}%</div>
            <div className="text-xs text-ink-soft mt-1">Qualified → Won</div>
          </div>
        </div>
      </section>
    </div>
  );
}
