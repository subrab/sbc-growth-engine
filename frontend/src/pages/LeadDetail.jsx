import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { PriorityBadge } from '../components/PriorityBadge';
import { ReviewRequestActions } from '../components/ReviewRequestActions';

const STATUS_OPTIONS = [
  'New', 'Contacted', 'Responded', 'Qualified', 'Discovery Scheduled', 'Discovery Completed',
  'Proposal Sent', 'Negotiation', 'Won', 'Lost', 'Nurture',
];

const NEXT_ACTION_OPTIONS = [
  'Call client', 'Send WhatsApp', 'Schedule discovery', 'Prepare proposal', 'Follow up', 'Close', 'Nurture',
];

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-ink-soft font-mono mb-0.5">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export function LeadDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const d = await api.getLead(id);
      setData(d);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleStatusChange(status) {
    setSaving(true);
    try {
      await api.updateLead(id, { status });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleNextActionChange(next_action) {
    setSaving(true);
    try {
      await api.updateLead(id, { next_action });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      await api.createActivity({ lead_id: id, type: 'Note', content: noteText.trim() });
      setNoteText('');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (error) return <div className="p-8 text-red-700">{error}</div>;
  if (!data) return <div className="p-8 text-ink-soft">Loading…</div>;

  const { lead, assessment, latest_score, activities, tasks } = data;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl">{lead.name}</h1>
          <p className="text-ink-soft text-sm">{lead.email} · {lead.phone || 'no phone on file'}</p>
        </div>
        <PriorityBadge priority={latest_score?.priority} />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div>
          <label className="text-xs uppercase tracking-wide text-ink-soft font-mono block mb-1">Status</label>
          <select
            value={lead.status}
            disabled={saving}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full border border-black/10 rounded px-2 py-1.5 text-sm"
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-ink-soft font-mono block mb-1">Next action</label>
          <select
            value={lead.next_action || ''}
            disabled={saving}
            onChange={(e) => handleNextActionChange(e.target.value)}
            className="w-full border border-black/10 rounded px-2 py-1.5 text-sm"
          >
            <option value="">— None set —</option>
            {NEXT_ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-soft font-mono mb-1">Score</div>
          <div className="text-sm">{latest_score ? `${latest_score.score} / 100` : '—'}</div>
        </div>
      </div>

      {lead.status === 'Won' && (
        <div className="bg-white border border-black/10 rounded p-4 mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-xs uppercase tracking-wide text-blue mb-1">Google review</div>
            <div className="text-sm">
              {lead.review_status === 'reviewed' ? 'Reviewed. Remember to reply to their review on Google.'
                : lead.review_status === 'asked' ? `Asked on ${new Date(lead.review_asked_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. A reminder is scheduled a week later.`
                : 'Not asked yet. A request is scheduled automatically, or ask now.'}
            </div>
          </div>
          {lead.review_status !== 'reviewed' && (
            <ReviewRequestActions lead={lead} stage={lead.review_status === 'asked' ? 'reminder' : 'request'} onDone={load} />
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-8 mb-8">
        <section className="space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-wide text-blue">Overview</h2>
          <Field label="Source" value={lead.source} />
          <Field label="Company" value={lead.business_type} />
          <Field label="Industry" value={lead.industry} />
          <Field label="Location" value={lead.location} />
          <Field label="Budget" value={lead.budget_range} />
          <Field label="Timeline" value={lead.timeline} />
          <Field label="Estimated value" value={lead.estimated_project_value} />
        </section>

        <section className="space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-wide text-blue">Problem</h2>
          <Field label="Main problem" value={lead.main_problem} />
          <Field label="Desired outcome" value={lead.desired_outcome} />
          {assessment && (
            <>
              <Field label="Current situation" value={assessment.current_situation} />
              <Field label="Biggest challenge" value={assessment.biggest_challenge} />
            </>
          )}
        </section>
      </div>

      <section className="mb-8">
        <h2 className="font-mono text-xs uppercase tracking-wide text-blue mb-3">Follow-ups</h2>
        {tasks.length === 0 ? (
          <p className="text-ink-soft text-sm">No follow-ups scheduled.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between text-sm bg-white border border-black/10 rounded px-4 py-2">
                <span>{t.reason}</span>
                <span className="text-ink-soft text-xs">{t.due_date} · {t.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-mono text-xs uppercase tracking-wide text-blue mb-3">Activity</h2>
        <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
          <input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note…"
            className="flex-1 border border-black/10 rounded px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-blue text-white text-sm font-medium px-4 rounded hover:bg-blue-deep transition-colors disabled:opacity-60"
          >
            Add
          </button>
        </form>
        <ul className="space-y-2">
          {activities.map((a) => (
            <li key={a.id} className="text-sm border-l-2 border-black/10 pl-3">
              <span className="font-medium">{a.type}</span>
              {a.content && <span className="text-ink-soft"> — {a.content}</span>}
              <div className="text-xs text-ink-soft">{new Date(a.created_at).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
