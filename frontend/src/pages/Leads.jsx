import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { api } from '../api';
import { PriorityBadge } from '../components/PriorityBadge';

const STATUS_OPTIONS = [
  'New', 'Contacted', 'Responded', 'Qualified', 'Discovery Scheduled', 'Discovery Completed',
  'Proposal Sent', 'Negotiation', 'Won', 'Lost', 'Nurture',
];

// Must match the database's `lead_source` enum exactly — free text here caused a
// 500 error before, since Postgres rejects any value outside this fixed set.
const SOURCE_OPTIONS = [
  'Website', 'Website Assessment', 'WhatsApp', 'Instagram', 'LinkedIn', 'Referral',
  'Community', 'Networking Event', 'Cold Email', 'Cold Outreach', 'Google',
  'Existing Client', 'Other',
];

const TIMELINE_OPTIONS = ['Immediately', 'Within 1 month', '1–3 months', '3–6 months', 'Exploring'];

const BUDGET_OPTIONS = ['Below ₹25K', '₹25K–₹50K', '₹50K–₹1L', '₹1L–₹3L', '₹3L+', 'Not sure'];

// Same list used on the Lead Detail page, so "next action" means the same thing everywhere.
const NEXT_ACTION_OPTIONS = [
  'Call client', 'Send WhatsApp', 'Schedule discovery', 'Prepare proposal', 'Follow up', 'Close', 'Nurture',
];

const BLANK_FORM = {
  name: '', email: '', phone: '', source: '', business_type: '',
  main_problem: '', budget_range: '', timeline: '', estimated_project_value: '',
  status: 'New',
};

// Handles both creating a new lead and editing an existing one — pass `lead` to edit.
function LeadForm({ lead, onSaved, onCancel }) {
  const isEdit = Boolean(lead);
  const [form, setForm] = useState(() =>
    lead
      ? {
          name: lead.name || '', email: lead.email || '', phone: lead.phone || '',
          source: lead.source || '', business_type: lead.business_type || '',
          main_problem: lead.main_problem || '', budget_range: lead.budget_range || '',
          timeline: lead.timeline || '', estimated_project_value: lead.estimated_project_value || '',
          status: lead.status || 'New',
        }
      : BLANK_FORM
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        // Send an actual number to the backend, or omit it entirely if left blank —
        // sending an empty string would fail the DB's numeric column type.
        estimated_project_value: form.estimated_project_value
          ? Number(form.estimated_project_value)
          : undefined,
        // Enum columns (source, status) reject an empty string outright — omit rather
        // than send "", so the DB's own default applies (only matters on create).
        source: form.source || undefined,
      };
      const result = isEdit
        ? await api.updateLead(lead.id, payload)
        : await api.createLead(payload);
      onSaved(result.lead);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-black/10 rounded p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-lg">{isEdit ? `Edit ${lead.name}` : 'Add a lead'}</h2>
        <button type="button" onClick={onCancel} className="text-ink-soft hover:text-ink" aria-label="Cancel">
          <X size={18} />
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1">Name *</label>
          <input
            type="text" required value={form.name} onChange={(e) => set('name', e.target.value)}
            className="w-full border border-black/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1">Email</label>
          <input
            type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
            className="w-full border border-black/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1">Phone</label>
          <input
            type="text" value={form.phone} onChange={(e) => set('phone', e.target.value)}
            className="w-full border border-black/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1">Source</label>
          <select
            value={form.source} onChange={(e) => set('source', e.target.value)}
            className="w-full border border-black/10 rounded px-2 py-2 text-sm"
          >
            <option value="">— Not set —</option>
            {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1">What they need</label>
          <input
            type="text" placeholder="e.g. Website, MVP" value={form.business_type} onChange={(e) => set('business_type', e.target.value)}
            className="w-full border border-black/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1">Status</label>
          <select
            value={form.status} onChange={(e) => set('status', e.target.value)}
            className="w-full border border-black/10 rounded px-2 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1">Budget range</label>
          <select
            value={form.budget_range} onChange={(e) => set('budget_range', e.target.value)}
            className="w-full border border-black/10 rounded px-2 py-2 text-sm"
          >
            <option value="">— Not set —</option>
            {BUDGET_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1">Timeline</label>
          <select
            value={form.timeline} onChange={(e) => set('timeline', e.target.value)}
            className="w-full border border-black/10 rounded px-2 py-2 text-sm"
          >
            <option value="">— Not set —</option>
            {TIMELINE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1">Estimated project value (₹)</label>
          <input
            type="number" min="0" placeholder="e.g. 50000" value={form.estimated_project_value}
            onChange={(e) => set('estimated_project_value', e.target.value)}
            className="w-full border border-black/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-ink-soft mb-1">Main problem / notes</label>
        <textarea
          rows={2} value={form.main_problem} onChange={(e) => set('main_problem', e.target.value)}
          className="w-full border border-black/10 rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:border-blue"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit" disabled={saving}
          className="bg-blue text-white text-sm font-semibold px-5 py-2 rounded hover:bg-blue-deep transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add lead'}
        </button>
        <button
          type="button" onClick={onCancel}
          className="text-sm text-ink-soft hover:text-ink px-5 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// The "Next action" cell is a live dropdown, not just a status label — picking a
// value saves immediately, so "None set" is something you fix right here, in place.
function NextActionCell({ lead, onChanged }) {
  const [saving, setSaving] = useState(false);

  async function handleChange(e) {
    const next_action = e.target.value;
    setSaving(true);
    try {
      const { lead: updated } = await api.updateLead(lead.id, { next_action });
      onChanged(updated);
    } catch {
      // Swallow — the select just reverts to the lead's last known value on next render.
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={lead.next_action || ''}
      disabled={saving}
      onChange={handleChange}
      className={`text-xs rounded px-2 py-1 border ${
        lead.next_action ? 'border-black/10 text-ink' : 'border-red-200 text-red-600 font-medium bg-red-50'
      }`}
    >
      <option value="">None set</option>
      {NEXT_ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
    </select>
  );
}

export function Leads() {
  const [leads, setLeads] = useState(null);
  const [error, setError] = useState('');
  const [formMode, setFormMode] = useState(null); // null | 'add' | { lead }
  const [selected, setSelected] = useState(() => new Set());
  const [deleting, setDeleting] = useState(false);

  function reload() {
    api.getLeads().then((d) => setLeads(d.leads)).catch((e) => setError(e.message));
  }

  useEffect(() => {
    reload();
  }, []);

  function handleSaved() {
    setFormMode(null);
    reload();
  }

  function handleLeadUpdatedInline(updated) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
  }

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === leads.length ? new Set() : new Set(leads.map((l) => l.id))));
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return;
    const label = selected.size === 1 ? 'this lead' : `these ${selected.size} leads`;
    if (!window.confirm(`Delete ${label}? This can't be undone from here.`)) return;
    setDeleting(true);
    try {
      await Promise.all([...selected].map((id) => api.deleteLead(id)));
      setSelected(new Set());
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  if (error) return <div className="p-8 text-red-700">{error}</div>;
  if (!leads) return <div className="p-8 text-ink-soft">Loading…</div>;

  const editingLead = formMode && formMode !== 'add' ? formMode.lead : null;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl">Leads</h1>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="flex items-center gap-2 bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-red-700 transition-colors disabled:opacity-60"
            >
              <Trash2 size={16} /> {deleting ? 'Deleting…' : `Delete (${selected.size})`}
            </button>
          )}
          {!formMode && (
            <button
              onClick={() => setFormMode('add')}
              className="flex items-center gap-2 bg-blue text-white text-sm font-semibold px-4 py-2 rounded hover:bg-blue-deep transition-colors"
            >
              <Plus size={16} /> Add lead
            </button>
          )}
        </div>
      </div>

      {formMode && (
        <LeadForm
          lead={editingLead}
          onSaved={handleSaved}
          onCancel={() => setFormMode(null)}
        />
      )}

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
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={selected.size === leads.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all leads"
                  />
                </th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Next action</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-paper-2 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggleSelected(lead.id)}
                      aria-label={`Select ${lead.name}`}
                    />
                  </td>
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
                    <NextActionCell lead={lead} onChanged={handleLeadUpdatedInline} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setFormMode({ lead })}
                      className="text-ink-soft hover:text-blue"
                      aria-label={`Edit ${lead.name}`}
                    >
                      <Pencil size={16} />
                    </button>
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
