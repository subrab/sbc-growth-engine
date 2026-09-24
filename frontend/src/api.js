const API_BASE = import.meta.env.VITE_API_URL || 'https://sbc-growth-engine-api.vercel.app/api';

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = localStorage.getItem('sbc_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Surface the backend's human-readable message rather than a generic failure.
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }

  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),

  getDashboard: () => request('/dashboard'),

  getLeads: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/leads${qs ? `?${qs}` : ''}`);
  },
  getLead: (id) => request(`/leads/${id}`),
  createLead: (payload) => request('/leads', { method: 'POST', body: payload }),
  updateLead: (id, payload) => request(`/leads/${id}`, { method: 'PATCH', body: payload }),
  deleteLead: (id) => request(`/leads/${id}`, { method: 'DELETE' }),

  createActivity: (payload) => request('/activities', { method: 'POST', body: payload }),

  getTasksDueToday: () => request('/tasks?due=today'),
  updateTask: (id, payload) => request(`/tasks/${id}`, { method: 'PATCH', body: payload }),

  getReviews: (status) => request(`/reviews${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  updateReview: (id, payload) => request(`/reviews/${id}`, { method: 'PATCH', body: payload }),
  deleteReview: (id) => request(`/reviews/${id}`, { method: 'DELETE' }),

  getInsights: (site, days) => request(`/insights?site=${encodeURIComponent(site)}&days=${days}`),

  // Public, unauthenticated — used by the assessment page, not the admin dashboard.
  submitAssessment: (payload) => request('/public/assessment', { method: 'POST', body: payload, auth: false }),
};
