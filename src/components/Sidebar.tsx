import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const NAV = [
  { to: "/clients", label: "Clients",  icon: "ti-device-desktop" },
  { to: "/mods",    label: "Mods",     icon: "ti-puzzle" },
  { to: "/skins",   label: "Skins",    icon: "ti-user-circle" },
];

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <nav className="sidebar">
      <Link className="sidebar-logo" to="/">
        <div className="sidebar-logo-mark">EX</div>
        <div>
          <span className="sidebar-logo-name">EaglercraftX</span>
          <span className="sidebar-logo-sub">Hub</span>
        </div>
      </Link>

      <div className="nav-section">Browse</div>
      <div className="nav-list">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            <i className={`ti ${icon}`} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </div>

      {user && user.role !== "user" && (
        <>
          <div className="nav-section">Moderation</div>
          <div className="nav-list">
            <NavLink
              to="/mod/pending"
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              <i className="ti ti-shield-check" aria-hidden="true" />
              Pending review
            </NavLink>
            <NavLink
              to="/mod/archive"
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              <i className="ti ti-archive" aria-hidden="true" />
              Archive
            </NavLink>
          </div>
        </>
      )}

      <div className="sidebar-spacer" />

      <div className="sidebar-footer">
        <div className="cdn-status-bar">
          <span className="cdn-dot ok" />
          <span>EaglercraftX CDN</span>
        </div>
        {user ? (
          <Link to={`/profile/${user.uid}`} className="sidebar-user">
            <img
              src={user.avatar}
              alt={user.name}
              className="sidebar-user-avatar"
            />
            <div>
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{user.role}</div>
            </div>
          </Link>
        ) : (
          <Link to="/login" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
