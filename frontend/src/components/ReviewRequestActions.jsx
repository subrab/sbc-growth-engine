import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Mail, Star } from 'lucide-react';
import { api } from '../api';
import { loadReviewSettings, fillTemplate, whatsappNumber, waLink, mailLink } from '../lib/reviewRequest';

// One-tap Google review request for a won client: opens WhatsApp (or email) with the message
// already written, then records it so the reminder schedule moves on.
export function ReviewRequestActions({ lead, stage = 'request', onDone, compact = false }) {
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadReviewSettings().then(setSettings).catch((e) => setError(e.message)); }, []);

  if (error) return <span className="text-xs text-red-700">{error}</span>;
  if (!settings) return null;
  if (!settings.google_review_link) {
    return (
      <Link to="/app/reviews" className="text-xs text-amber-800 bg-amber/10 border border-amber/40 rounded px-2.5 py-1.5 hover:bg-amber/20">
        Add your Google review link first →
      </Link>
    );
  }

  const template = stage === 'reminder' ? settings.review_reminder_message : settings.review_request_message;
  const text = fillTemplate(template, lead, settings.google_review_link);
  const canWa = !!whatsappNumber(lead.phone);
  const canEmail = !!lead.email;

  async function record(channel) {
    setBusy(true);
    try { await api.reviewRequestSent(lead.id, channel); onDone?.(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function reviewed() {
    setBusy(true);
    try { await api.reviewRequestReviewed(lead.id); onDone?.(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const btn = 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium disabled:opacity-50';
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {canWa && (
        <button disabled={busy} className={`${btn} bg-[#25D366] text-white hover:brightness-95`}
          title={text}
          onClick={() => { window.open(waLink(lead.phone, text), '_blank', 'noopener'); record('WhatsApp'); }}>
          <MessageCircle size={13} /> {stage === 'reminder' ? 'Remind on WhatsApp' : 'Ask on WhatsApp'}
        </button>
      )}
      {canEmail && (
        <button disabled={busy} className={`${btn} border border-black/10 text-ink hover:bg-white`}
          onClick={() => { window.location.href = mailLink(lead.email, 'A quick favour: your Google review', text); record('Email'); }}>
          <Mail size={13} /> {compact ? 'Email' : 'Send email'}
        </button>
      )}
      {!canWa && !canEmail && <span className="text-xs text-ink-soft">No phone or email on file</span>}
      <button disabled={busy} className={`${btn} border border-black/10 text-ink-soft hover:text-ink hover:bg-white`}
        title="The client has left a review, so stop asking" onClick={reviewed}>
        <Star size={13} /> Reviewed
      </button>
    </div>
  );
}
