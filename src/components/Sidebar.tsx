import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { getGravatarUrl } from '../lib/helpers';

const Sidebar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <img src="/logo.png" alt="Eaglercraft" />
          <h1>EagXLauncher</h1>
        </div>
      </div>

      <nav className="sidebar-nav">
        <a href="/clients" className="nav-link">
          <span className="icon">🎮</span>
          <span>Clients</span>
        </a>
        <a href="/mods" className="nav-link">
          <span className="icon">🔧</span>
          <span>Mods</span>
        </a>
        <a href="/skins" className="nav-link">
          <span className="icon">👕</span>
          <span>Skins</span>
        </a>
      </nav>

      <div className="sidebar-footer">
        {isAuthenticated && user ? (
          <div className="user-section">
            <img
              src={getGravatarUrl(user.email)}
              alt={user.name}
              className="user-avatar"
            />
            <div className="user-info">
              <p className="user-name">{user.name}</p>
              <p className="user-email">{user.email}</p>
            </div>
            <button onClick={logout} className="logout-btn">
              Logout
            </button>
          </div>
        ) : (
          <a href="/auth" className="login-link">
            <span className="icon">🔑</span>
            <span>Login</span>
          </a>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
