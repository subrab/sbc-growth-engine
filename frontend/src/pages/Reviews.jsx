import { useCallback, useEffect, useState } from 'react';
import { Check, X, RotateCcw, Trash2, Star } from 'lucide-react';
import { api } from '../api';
import { ReviewRequestsPanel } from '../components/ReviewRequestsPanel';

const TABS = ['Pending', 'Approved', 'Rejected'];

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={15} className={n <= rating ? 'fill-amber text-amber' : 'text-black/20'} />
      ))}
    </div>
  );
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function Reviews() {
  const [tab, setTab] = useState('Pending');
  const [reviews, setReviews] = useState([]);
  const [counts, setCounts] = useState({ Pending: 0, Approved: 0, Rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getReviews(tab);
      setReviews(data.reviews);
      setCounts(data.counts);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id, status) {
    setBusyId(id);
    try {
      await api.updateReview(id, { status });
      await load();
      window.dispatchEvent(new Event('reviews-changed'));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this review permanently? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await api.deleteReview(id);
      await load();
      window.dispatchEvent(new Event('reviews-changed'));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="font-display font-bold text-2xl mb-2">Reviews</h1>
      <div className="mt-6"><ReviewRequestsPanel /></div>
      <h2 className="font-display font-semibold text-lg mb-2">Website reviews</h2>
      <p className="text-ink-soft text-sm mb-6">
        Reviews submitted on sbclabs.tech land here as <b>Pending</b>. Only <b>Approved</b> reviews appear on the website.
      </p>

      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded text-sm font-medium border transition-colors ${
              tab === t ? 'bg-navy text-white border-navy' : 'bg-white border-black/10 text-ink-soft hover:text-ink'
            }`}
          >
            {t}
            <span className={`ml-2 font-mono text-xs ${tab === t ? 'text-white/70' : 'text-ink-soft'}`}>{counts[t] || 0}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
      )}

      {loading ? (
        <div className="text-ink-soft text-sm">Loading…</div>
      ) : reviews.length === 0 ? (
        <div className="bg-white border border-black/10 rounded p-6 text-ink-soft text-sm">
          {tab === 'Pending' ? 'No reviews waiting for approval.' : `No ${tab.toLowerCase()} reviews yet.`}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white border border-black/10 rounded p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-ink-soft">
                    {[r.role, r.company].filter(Boolean).join(' · ') || '—'}
                    {r.email && <> · <a className="underline" href={`mailto:${r.email}`}>{r.email}</a></>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Stars rating={r.rating} />
                  <div className="text-xs font-mono text-ink-soft mt-1">{formatDate(r.created_at)}</div>
                </div>
              </div>
              <p className="text-sm text-ink whitespace-pre-line mb-4">{r.review_text}</p>
              <div className="flex flex-wrap gap-2">
                {r.status !== 'Approved' && (
                  <button
                    disabled={busyId === r.id}
                    onClick={() => setStatus(r.id, 'Approved')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    <Check size={15} /> Approve
                  </button>
                )}
                {r.status !== 'Rejected' && (
                  <button
                    disabled={busyId === r.id}
                    onClick={() => setStatus(r.id, 'Rejected')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border border-black/10 text-ink hover:bg-paper-2 disabled:opacity-50"
                  >
                    <X size={15} /> {r.status === 'Approved' ? 'Remove from website' : 'Reject'}
                  </button>
                )}
                {r.status !== 'Pending' && (
                  <button
                    disabled={busyId === r.id}
                    onClick={() => setStatus(r.id, 'Pending')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border border-black/10 text-ink-soft hover:bg-paper-2 disabled:opacity-50"
                  >
                    <RotateCcw size={15} /> Move to Pending
                  </button>
                )}
                <button
                  disabled={busyId === r.id}
                  onClick={() => remove(r.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 ml-auto"
                >
                  <Trash2 size={15} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
