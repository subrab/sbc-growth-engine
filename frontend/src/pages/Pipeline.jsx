import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { PriorityBadge } from '../components/PriorityBadge';

const COLUMNS = ['New', 'Contacted', 'Qualified', 'Discovery Scheduled', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];

export function Pipeline() {
  const [leads, setLeads] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getLeads().then((d) => setLeads(d.leads)).catch((e) => setError(e.message));
  }, []);

  async function handleDrop(e, status) {
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;
    try {
      await api.updateLead(leadId, { status });
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)));
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <div className="p-8 text-red-700">{error}</div>;
  if (!leads) return <div className="p-8 text-ink-soft">Loading…</div>;

  return (
    <div className="p-8">
      <h1 className="font-display font-bold text-2xl mb-6">Pipeline</h1>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((status) => {
          const columnLeads = leads.filter((l) => l.status === status);
          const totalValue = columnLeads.reduce((sum, l) => sum + (Number(l.estimated_project_value) || 0), 0);

          return (
            <div
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, status)}
              className="w-64 shrink-0 bg-paper-2 rounded p-3"
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{status}</span>
                <span className="text-xs text-ink-soft">{columnLeads.length}</span>
              </div>
              <div className="space-y-2 min-h-[40px]">
                {columnLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('leadId', lead.id)}
                    className="bg-white border border-black/10 rounded p-3 cursor-grab active:cursor-grabbing"
                  >
                    <Link to={`/app/leads/${lead.id}`} className="font-medium text-sm hover:text-blue block mb-1">
                      {lead.name}
                    </Link>
                    <div className="flex items-center justify-between">
                      <PriorityBadge priority={lead.priority} />
                      {lead.estimated_project_value && (
                        <span className="text-xs text-ink-soft">₹{Number(lead.estimated_project_value).toLocaleString('en-IN')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {totalValue > 0 && (
                <div className="text-xs text-ink-soft mt-2 px-1">
                  Total: ₹{totalValue.toLocaleString('en-IN')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
