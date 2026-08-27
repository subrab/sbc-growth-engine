import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

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

  useEffect(() => {
    api.getDashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="p-8 text-red-700">{error}</div>;
  if (!data) return <div className="p-8 text-ink-soft">Loading…</div>;

  const { today, pipeline, business } = data;

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="font-display font-bold text-2xl mb-8">Dashboard</h1>

      {/* TODAY */}
      <section className="mb-10">
        <h2 className="font-mono text-xs uppercase tracking-wide text-blue mb-3">Today</h2>
        {today.follow_ups_due.length === 0 ? (
          <div className="bg-white border border-black/10 rounded p-6 text-ink-soft text-sm">
            No follow-ups due today. Nothing urgent — good moment to reach out to a lead proactively.
          </div>
        ) : (
          <div className="bg-white border border-black/10 rounded divide-y divide-black/5">
            {today.follow_ups_due.map((task) => (
              <Link
                key={task.id}
                to={`/app/leads/${task.lead_id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-paper-2 transition-colors"
              >
                <div>
                  <div className="font-medium text-sm">{task.lead_name}</div>
                  <div className="text-ink-soft text-xs">{task.reason}</div>
                </div>
                <div className="text-xs font-mono text-ink-soft">{task.due_date}</div>
              </Link>
            ))}
          </div>
        )}
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
