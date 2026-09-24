import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Kanban, Star, LogOut } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/leads', label: 'Leads', icon: Users },
  { to: '/app/pipeline', label: 'Pipeline', icon: Kanban },
  { to: '/app/reviews', label: 'Reviews', icon: Star, badgeKey: 'pendingReviews' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [badges, setBadges] = useState({ pendingReviews: 0 });

  // Shows how many reviews are waiting for approval next to "Reviews" in the sidebar.
  useEffect(() => {
    const refresh = () =>
      api.getReviews('Pending')
        .then((d) => setBadges({ pendingReviews: d.counts?.Pending || 0 }))
        .catch(() => {});
    refresh();
    window.addEventListener('reviews-changed', refresh);
    return () => window.removeEventListener('reviews-changed', refresh);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex bg-paper">
      <aside className="w-60 bg-navy text-white flex flex-col shrink-0">
        <div className="px-6 py-5 font-display font-bold text-lg flex items-center gap-2">
          <span className="w-8 h-8 rounded bg-white/10 flex items-center justify-center font-mono text-xs">SBC</span>
          Growth Engine
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end, badgeKey }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
              {badgeKey && badges[badgeKey] > 0 && (
                <span className="ml-auto bg-amber text-navy text-xs font-mono font-semibold rounded-full px-2 py-0.5">
                  {badges[badgeKey]}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-white/10 text-sm">
          <div className="text-white/50 mb-2 truncate">{user?.email}</div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
