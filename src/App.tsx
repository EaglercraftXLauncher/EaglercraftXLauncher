import { Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import BrowserPage from "./pages/BrowserPage";
import ProfilePage from "./pages/ProfilePage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import AuthErrorPage from "./pages/AuthErrorPage";
import AuthPage from "./pages/AuthPage";

// Icons as inline SVG so no icon library needed
const IconClients = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
  </svg>
);
const IconMods = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);
const IconSkins = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconLogin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
  </svg>
);
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

function Sidebar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <NavLink to="/" className="sidebar-logo">
        <div className="sidebar-logo-mark">EX</div>
        <div>
          <div className="sidebar-logo-name">EagXL</div>
          <div className="sidebar-logo-sub">Launcher Hub</div>
        </div>
      </NavLink>

      <div className="nav-section">Browse</div>
      <NavLink to="/clients" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        <IconClients /> <span>Clients</span>
      </NavLink>
      <NavLink to="/mods" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        <IconMods /> <span>Mods</span>
      </NavLink>
      <NavLink to="/skins" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        <IconSkins /> <span>Skins</span>
      </NavLink>

      <div className="sidebar-spacer" />

      {isAuthenticated && user ? (
        <div className="sidebar-user-wrap">
          <NavLink to={`/profile/${user.uid}`} className="sidebar-user">
            <img
              src={`https://www.gravatar.com/avatar/${btoa(user.email ?? '').slice(0,8)}?d=identicon&s=64`}
              alt={user.name}
              className="sidebar-user-avatar"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`; }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{user.role}</div>
            </div>
          </NavLink>
          <button className="nav-link logout-btn" onClick={handleLogout}>
            <IconLogout /> <span>Sign out</span>
          </button>
        </div>
      ) : (
        <NavLink to="/login" className="nav-link login-cta">
          <IconLogin /> <span>Sign in</span>
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
        <Routes>
          <Route path="/" element={<Navigate to="/clients" replace />} />
          <Route path="/clients" element={<BrowserPage type="client" />} />
          <Route path="/mods"    element={<BrowserPage type="mod" />} />
          <Route path="/skins"   element={<BrowserPage type="skin" />} />
          <Route path="/profile/:uid"  element={<ProfilePage />} />
          <Route path="/login"         element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/auth/error"    element={<AuthErrorPage />} />
        </Routes>
      </div>
    </div>
  );
}
