// WhatsApp alert to the owner whenever a new website enquiry arrives.
// Provider is chosen by WHATSAPP_PROVIDER: "callmebot" (default) | "meta" | "off".
// Never throws — a failed alert must never break the public form.

const TIMEOUT_MS = 5000;

function clip(text, max = 140) {
  if (!text) return '—';
  const s = String(text).trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function buildLeadMessage(lead) {
  const base = (process.env.APP_BASE_URL || '').replace(/\/$/, '');
  const lines = [
    '🔔 New enquiry — SBC Growth Engine',
    '',
    `Name: ${clip(lead.name, 60)}`,
    `Phone: ${lead.phone || lead.whatsapp || '—'}`,
    `Email: ${lead.email || '—'}`,
    `Looking for: ${clip(lead.business_type || lead.industry, 80)}`,
    `Problem: ${clip(lead.main_problem)}`,
    `Budget: ${lead.budget_range || '—'} | Timeline: ${lead.timeline || '—'}`,
    `Source: ${lead.source || 'Website'}`,
  ];
  if (base && lead.id) lines.push('', `Open: ${base}/app/leads/${lead.id}`);
  return lines.join('\n');
}

async function timedFetch(url, options = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function sendViaCallMeBot(text) {
  const { CALLMEBOT_PHONE, CALLMEBOT_APIKEY } = process.env;
  if (!CALLMEBOT_PHONE || !CALLMEBOT_APIKEY) throw new Error('CALLMEBOT_PHONE / CALLMEBOT_APIKEY not set');
  const url = 'https://api.callmebot.com/whatsapp.php'
    + `?phone=${encodeURIComponent(CALLMEBOT_PHONE)}`
    + `&text=${encodeURIComponent(text)}`
    + `&apikey=${encodeURIComponent(CALLMEBOT_APIKEY)}`;
  const res = await timedFetch(url);
  if (!res.ok) throw new Error(`CallMeBot HTTP ${res.status}`);
}

async function sendViaMeta(text) {
  const { META_WA_TOKEN, META_WA_PHONE_ID, META_WA_TO, META_WA_TEMPLATE } = process.env;
  if (!META_WA_TOKEN || !META_WA_PHONE_ID || !META_WA_TO || !META_WA_TEMPLATE) {
    throw new Error('Meta WhatsApp env vars not set');
  }
  const flat = text.replace(/\n+/g, ' | ').slice(0, 1000); // template params can't hold newlines
  const res = await timedFetch(`https://graph.facebook.com/v21.0/${META_WA_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${META_WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: META_WA_TO,
      type: 'template',
      template: {
        name: META_WA_TEMPLATE,
        language: { code: process.env.META_WA_LANG || 'en' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: flat }] }],
      },
    }),
  });
  if (!res.ok) throw new Error(`Meta WA HTTP ${res.status}: ${await res.text()}`);
}

export async function notifyNewLead(lead) {
  const provider = (process.env.WHATSAPP_PROVIDER || 'callmebot').toLowerCase();
  if (provider === 'off') return;
  try {
    const text = buildLeadMessage(lead);
    if (provider === 'meta') await sendViaMeta(text);
    else await sendViaCallMeBot(text);
  } catch (err) {
    console.error('[whatsappNotify] failed:', err.message);
  }
}
