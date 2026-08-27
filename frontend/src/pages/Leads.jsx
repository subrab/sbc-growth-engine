import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { api } from '../api';
import { PriorityBadge } from '../components/PriorityBadge';

export function Leads() {
  const [leads, setLeads] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getLeads().then((d) => setLeads(d.leads)).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="p-8 text-red-700">{error}</div>;
  if (!leads) return <div className="p-8 text-ink-soft">Loading…</div>;

  return (
    <div className="p-8">
      <h1 className="font-display font-bold text-2xl mb-6">Leads</h1>

      {leads.length === 0 ? (
        <div className="bg-white border border-black/10 rounded p-8 text-center max-w-md">
          <p className="font-medium mb-1">No leads yet.</p>
          <p className="text-ink-soft text-sm">
            Your first client starts here. Share your SBC Labs assessment link or add your first prospect.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-black/10 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper-2 text-left text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Next action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-paper-2 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/app/leads/${lead.id}`} className="font-medium hover:text-blue">
                      {lead.name}
                    </Link>
                    <div className="text-xs text-ink-soft">{lead.email}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{lead.source}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-paper-2">{lead.status}</span>
                  </td>
                  <td className="px-4 py-3"><PriorityBadge priority={lead.priority} /></td>
                  <td className="px-4 py-3">
                    {lead.missing_next_action ? (
                      <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                        <AlertCircle size={14} /> None set
                      </span>
                    ) : (
                      <span className="text-ink-soft text-xs">{lead.next_action}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
