import { useState } from 'react';
import { api } from '../api';

const STEPS = ['About you', 'Business', 'Current situation', 'Biggest challenge', 'Desired solution', 'Timeline', 'Budget', 'The problem'];

const CHALLENGE_OPTIONS = [
  'Getting more customers', 'Managing customers', 'Managing employees', 'Managing payments',
  'Managing bookings', 'Reporting', 'Manual processes', 'Communication', 'Website',
  'Mobile app', 'Business automation', 'Other',
];
const SOLUTION_OPTIONS = ['Website', 'Web Application', 'Mobile Application', 'Automation', 'MVP', 'Product Consulting', 'Not sure'];
const TIMELINE_OPTIONS = ['Immediately', 'Within 1 month', '1–3 months', '3–6 months', 'Exploring'];
const BUDGET_OPTIONS = ['Below ₹25K', '₹25K–₹50K', '₹50K–₹1L', '₹1L–₹3L', '₹3L+', 'Not sure'];
const SITUATION_OPTIONS = ['Excel', 'Google Sheets', 'WhatsApp', 'Paper', 'Existing software', 'Multiple systems', 'Other'];

export function Assessment() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '', website: '',
    industry: '', company_size: '',
    current_situation: '', biggest_challenge: '', desired_solution: '',
    timeline: '', budget_range: '', problem_description: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function next() { setStep((s) => Math.min(s + 1, STEPS.length - 1)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.submitAssessment(form);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-navy text-white flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display font-bold text-2xl mb-3">Thank you.</h1>
          <p className="text-white/70">
            Thanks for sharing your business challenge. We'll review your requirements and get back to you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy text-white flex items-center justify-center px-4 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        <div className="mb-6">
          <div className="font-mono text-xs text-amber uppercase tracking-wide mb-1">
            Step {step + 1} of {STEPS.length}
          </div>
          <h1 className="font-display font-bold text-2xl">{STEPS[step]}</h1>
        </div>

        {error && (
          <div className="mb-4 text-sm bg-red-500/10 border border-red-500/30 text-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-8">
          {step === 0 && (
            <>
              <TextInput label="Name" value={form.name} onChange={(v) => update('name', v)} required />
              <TextInput label="Email" type="email" value={form.email} onChange={(v) => update('email', v)} required />
              <TextInput label="Phone" value={form.phone} onChange={(v) => update('phone', v)} />
              <TextInput label="Company" value={form.company} onChange={(v) => update('company', v)} />
              <TextInput label="Website" value={form.website} onChange={(v) => update('website', v)} />
            </>
          )}
          {step === 1 && (
            <>
              <TextInput label="Industry" value={form.industry} onChange={(v) => update('industry', v)} />
              <TextInput label="Company size / employees" value={form.company_size} onChange={(v) => update('company_size', v)} />
            </>
          )}
          {step === 2 && (
            <OptionGrid options={SITUATION_OPTIONS} value={form.current_situation} onChange={(v) => update('current_situation', v)} />
          )}
          {step === 3 && (
            <OptionGrid options={CHALLENGE_OPTIONS} value={form.biggest_challenge} onChange={(v) => update('biggest_challenge', v)} />
          )}
          {step === 4 && (
            <OptionGrid options={SOLUTION_OPTIONS} value={form.desired_solution} onChange={(v) => update('desired_solution', v)} />
          )}
          {step === 5 && (
            <OptionGrid options={TIMELINE_OPTIONS} value={form.timeline} onChange={(v) => update('timeline', v)} />
          )}
          {step === 6 && (
            <OptionGrid options={BUDGET_OPTIONS} value={form.budget_range} onChange={(v) => update('budget_range', v)} />
          )}
          {step === 7 && (
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1">
                What would you like to improve or build?
              </label>
              <textarea
                value={form.problem_description}
                onChange={(e) => update('problem_description', e.target.value)}
                rows={5}
                className="w-full bg-white/5 border border-white/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue"
              />
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="text-sm text-white/60 hover:text-white disabled:opacity-30 transition-colors"
          >
            ← Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              disabled={step === 0 && (!form.name || !form.email)}
              className="bg-blue text-white text-sm font-semibold px-5 py-2 rounded hover:bg-blue-deep transition-colors disabled:opacity-40"
            >
              Continue →
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="bg-blue text-white text-sm font-semibold px-5 py-2 rounded hover:bg-blue-deep transition-colors disabled:opacity-60"
            >
              {loading ? 'Submitting…' : 'Submit'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function TextInput({ label, value, onChange, type = 'text', required }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/60 mb-1">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue"
      />
    </div>
  );
}

function OptionGrid({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`text-sm text-left px-3 py-2.5 rounded border transition-colors ${
            value === opt
              ? 'bg-blue border-blue text-white'
              : 'bg-white/5 border-white/15 text-white/80 hover:border-white/40'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
