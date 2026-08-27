import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/app');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-md p-8 shadow-xl">
        <div className="font-display font-bold text-xl mb-1">SBC Labs</div>
        <p className="text-ink-soft text-sm mb-6">Growth Engine — sign in</p>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        <label className="block text-xs font-semibold text-ink-soft mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-black/10 rounded px-3 py-2 mb-4 text-sm focus:outline-none focus:border-blue"
        />

        <label className="block text-xs font-semibold text-ink-soft mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-black/10 rounded px-3 py-2 mb-6 text-sm focus:outline-none focus:border-blue"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue text-white font-semibold py-2.5 rounded hover:bg-blue-deep transition-colors disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
