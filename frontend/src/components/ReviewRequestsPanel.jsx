import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { ReviewRequestActions } from './ReviewRequestActions';
import { clearReviewSettingsCache, fillTemplate } from '../lib/reviewRequest';

const fmt = (d) => (d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');

function StatusPill({ c }) {
  if (c.review_status === 'reviewed') return <span className="text-xs font-medium text-green-800 bg-green-100 rounded-full px-2 py-0.5">Reviewed {fmt(c.reviewed_at)}</span>;
  if (c.review_status === 'asked') return <span className="text-xs font-medium text-amber-900 bg-amber/20 rounded-full px-2 py-0.5">Asked {fmt(c.review_asked_at)}</span>;
  return <span className="text-xs font-medium text-ink-soft bg-paper-2 rounded-full px-2 py-0.5">Not asked yet</span>;
}

// Google review requests: settings + every won client and where they are.
export function ReviewRequestsPanel() {
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState(null);
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => Promise.all([api.getSettings(), api.getReviewRequests()]).then(([s, r]) => {
    setSettings(s.settings); setDraft(s.settings); setClients(r.clients);
    if (!s.settings.google_review_link) setOpen(true);
  }).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setMsg('');
    try {
      const { settings: s } = await api.saveSettings(draft);
      setSettings(s); setDraft(s); clearReviewSettingsCache(); setMsg('Saved.'); setOpen(false);
    } catch (e) { setMsg(e.message); } finally { setSaving(false); }
  }

  if (!settings) return null;
  const pending = clients.filter((c) => c.review_status !== 'reviewed').length;
  const input = 'w-full border border-black/10 rounded px-3 py-2 text-sm bg-white';

  return (
    <section className="mb-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="font-display font-semibold text-lg">Google review requests</h2>
        <button onClick={() => setOpen(!open)} className="text-sm text-blue-deep font-medium hover:underline">
          {open ? 'Close settings' : settings.google_review_link ? 'Edit link & messages' : 'Set up'}
        </button>
      </div>
      <p className="text-ink-soft text-sm mb-4">
        When a lead is marked <b>Won</b>, a request to review you on Google is scheduled 3 days later, with one reminder a week after that.
        Each one appears on your Dashboard with a one-tap WhatsApp button.
      </p>

      {open && (
        <div className="bg-white border border-black/10 rounded p-5 mb-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">Your Google review link</label>
            <input className={input} placeholder="https://g.page/r/..." value={draft.google_review_link}
              onChange={(e) => setDraft({ ...draft, google_review_link: e.target.value })} />
            <p className="text-xs text-ink-soft mt-1">Google Business Profile → <b>Ask for reviews</b> → copy the link.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">First request message</label>
            <textarea rows={5} className={input} value={draft.review_request_message}
              onChange={(e) => setDraft({ ...draft, review_request_message: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">Reminder message (sent once, a week later)</label>
            <textarea rows={4} className={input} value={draft.review_reminder_message}
              onChange={(e) => setDraft({ ...draft, review_reminder_message: e.target.value })} />
            <p className="text-xs text-ink-soft mt-1">Use <code>{'{first_name}'}</code> for the client's first name and <code>{'{review_link}'}</code> for your link.</p>
          </div>
          <div className="text-xs text-ink-soft bg-paper-2 rounded p-3 whitespace-pre-line">
            <b>Preview:</b>{'\n'}{fillTemplate(draft.review_request_message, { name: 'Meena Raj' }, draft.google_review_link || '[your review link]')}
          </div>
          <div className="flex items-center gap-3">
            <button disabled={saving} onClick={save} className="bg-blue text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50">Save</button>
            {msg && <span className="text-sm text-ink-soft">{msg}</span>}
          </div>
        </div>
      )}

      {clients.length === 0 ? (
        <div className="bg-white border border-black/10 rounded p-5 text-sm text-ink-soft">
          No won clients yet. When you mark a lead as <b>Won</b>, it will appear here.
        </div>
      ) : (
        <div className="bg-white border border-black/10 rounded divide-y divide-black/5">
          <div className="px-5 py-2 text-xs text-ink-soft">{clients.length} won client{clients.length === 1 ? '' : 's'} · {pending} still to review</div>
          {clients.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <Link to={`/app/leads/${c.id}`} className="font-medium text-sm hover:underline">{c.name}</Link>
                <div className="flex items-center gap-2 mt-1">
                  <StatusPill c={c} />
                  {c.next_due && c.review_status !== 'reviewed' && (
                    <span className="text-xs text-ink-soft">{c.next_kind === 'review_reminder' ? 'Reminder' : 'Request'} due {fmt(c.next_due)}</span>
                  )}
                </div>
              </div>
              {c.review_status !== 'reviewed' && (
                <ReviewRequestActions compact lead={c} stage={c.review_status === 'asked' ? 'reminder' : 'request'} onDone={load} />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
