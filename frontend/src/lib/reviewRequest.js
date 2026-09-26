import { api } from '../api';

// Settings (Google review link + message templates) are loaded once and shared.
let cache = null;
export function loadReviewSettings(force = false) {
  if (!cache || force) cache = api.getSettings().then((d) => d.settings).catch((e) => { cache = null; throw e; });
  return cache;
}
export function clearReviewSettingsCache() { cache = null; }

export function fillTemplate(template, lead, link) {
  const first = (lead.name || '').trim().split(/\s+/)[0] || 'there';
  return template.replaceAll('{first_name}', first).replaceAll('{name}', lead.name || '').replaceAll('{review_link}', link || '');
}

// Indian mobile numbers are usually stored without the country code; wa.me needs it.
export function whatsappNumber(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10) d = '91' + d;
  return d.length >= 11 ? d : null;
}

export const waLink = (phone, text) => `https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(text)}`;
export const mailLink = (email, subject, text) =>
  `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
