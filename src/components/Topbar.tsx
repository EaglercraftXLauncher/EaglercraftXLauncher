import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";

const TITLES: Record<string, string> = {
  "/clients": "Clients",
  "/mods":    "Mods",
  "/skins":   "Skins",
};

interface TopbarProps {
  onSearch?: (term: string) => void;
}

export default function Topbar({ onSearch }: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);

  const title = TITLES[location.pathname] ?? "EaglercraftX Hub";

  async function handleLogout() {
    await logout();
    toast("Signed out", "success");
    navigate("/login");
  }

  return (
    <header className="topbar">
      <button
        className="hamburger"
        aria-label="Toggle menu"
        onClick={() => setMenuOpen(v => !v)}
      >
        <span /><span /><span />
      </button>

      <span className="topbar-title">{title}</span>

      {onSearch && (
        <div className="topbar-search">
          <i className="ti ti-search" aria-hidden="true" style={{ color: "var(--text3)", fontSize: 15 }} />
          <input
            type="search"
            placeholder="Search…"
            onChange={e => onSearch(e.target.value)}
          />
        </div>
      )}

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        {user ? (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              aria-label="Account menu"
            >
              <img
                src={user.avatar}
                alt={user.name}
                style={{ width: 32, height: 32, borderRadius: "50%", display: "block" }}
              />
            </button>
            {menuOpen && (
              <div style={{
                position: "absolute", right: 0, top: 40, zIndex: 100,
                background: "var(--surface2)", border: "1px solid var(--border2)",
                borderRadius: "var(--radius-lg)", padding: 6, minWidth: 160,
                boxShadow: "var(--shadow)",
              }}>
                <button
                  onClick={() => { navigate(`/profile/${user.uid}`); setMenuOpen(false); }}
                  className="nav-link"
                  style={{ width: "100%" }}
                >
                  <i className="ti ti-user" aria-hidden="true" />
                  My profile
                </button>
                <button
                  onClick={handleLogout}
                  className="nav-link"
                  style={{ width: "100%", color: "var(--red)" }}
                >
                  <i className="ti ti-logout" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/login")}>
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
