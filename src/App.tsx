import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import BrowserPage      from './pages/BrowserPage';
import ProfilePage      from './pages/ProfilePage';
import UsersPage        from './pages/UsersPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import AuthErrorPage    from './pages/AuthErrorPage';
import AuthPage         from './pages/AuthPage';
import SettingsPage     from './pages/SettingsPage';
import AdminDashboard   from './pages/AdminDashboard';
import Topbar           from './components/Topbar';

const I = {
  clients:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  mods:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  skins:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  users:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  settings: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  admin:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  login:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>,
  logout:   () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  owner:     { bg: 'rgba(52,217,149,0.12)', color: 'var(--green)' },
  admin:     { bg: 'rgba(245,158,66,0.1)',  color: 'var(--orange)' },
  developer: { bg: 'rgba(79,124,255,0.12)', color: 'var(--accent)' },
  user:      { bg: 'var(--surface3)',        color: 'var(--text3)' },
};

function Sidebar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate  = useNavigate();
  const canAdmin  = user?.role === 'admin' || user?.role === 'owner';
  const rs        = user ? (ROLE_STYLE[user.role] ?? ROLE_STYLE.user) : ROLE_STYLE.user;

  return (
    <aside className="sidebar">
      <NavLink to="/" className="sidebar-logo">
        <div className="sidebar-logo-mark">EX</div>
        <div>
          <div className="sidebar-logo-name">EagXL</div>
          <div className="sidebar-logo-sub">Launcher Hub</div>
        </div>
      </NavLink>

      {/* Browse */}
      <div className="nav-section">Browse</div>
      <NavLink to="/clients" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        <I.clients /><span>Clients</span>
      </NavLink>
      <NavLink to="/mods" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        <I.mods /><span>Mods</span>
      </NavLink>
      <NavLink to="/skins" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        <I.skins /><span>Skins</span>
      </NavLink>

      {/* Social */}
      <div className="nav-section">Social</div>
      <NavLink to="/users" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        <I.users /><span>Users</span>
      </NavLink>

      {/* Account */}
      {isAuthenticated && (
        <>
          <div className="nav-section">Account</div>
          <NavLink to="/settings" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <I.settings /><span>Settings</span>
          </NavLink>
          {canAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              style={({ isActive }) => isActive ? {} : {
                color: user?.role === 'owner' ? 'var(--green)' : 'var(--orange)',
              }}>
              <I.admin /><span>Admin</span>
            </NavLink>
          )}
        </>
      )}

      <div className="sidebar-spacer" />

      {isAuthenticated && user ? (
        <div className="sidebar-user-wrap">
          <NavLink to={`/profile/${user.uid}`} className="sidebar-user">
            <img
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=4f7cff&textColor=ffffff`}
              alt={user.name} className="sidebar-user-avatar"
              onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`; }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name">{user.name}</div>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                background: rs.bg, color: rs.color }}>{user.role}</span>
            </div>
          </NavLink>
          <button className="nav-link logout-btn"
            onClick={async () => { await logout(); navigate('/login'); }}>
            <I.logout /><span>Sign out</span>
          </button>
        </div>
      ) : (
        <NavLink to="/login" className="nav-link login-cta">
          <I.login /><span>Sign in</span>
        </NavLink>
      )}
    </aside>
  );
}

export default function App() {
  return (
    <div className="layout">
      <Sidebar />
      <div className="page">
        <Topbar />
        <Routes>
          <Route path="/"              element={<Navigate to="/clients" replace />} />
          <Route path="/clients"       element={<BrowserPage kind="client" />} />
          <Route path="/mods"          element={<BrowserPage kind="mod" />} />
          <Route path="/skins"         element={<BrowserPage kind="skin" />} />
          <Route path="/users"         element={<UsersPage />} />
          <Route path="/profile/:uid"  element={<ProfilePage />} />
          <Route path="/settings"      element={<SettingsPage />} />
          <Route path="/admin"         element={<AdminDashboard />} />
          <Route path="/login"         element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/auth/error"    element={<AuthErrorPage />} />
        </Routes>
      </div>
    </div>
  );
}
