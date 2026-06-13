import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const API = '/api';

interface PublicUser {
  uid:          string;
  name:         string;
  bio:          string;
  role:         string;
  avatar:       string;
  createdAt:    string;
  banned?:      boolean;
  bannedUntil?: string | null;
  banReason?:   string;
}

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  owner:     { bg: 'rgba(52,217,149,0.12)',  color: 'var(--green)' },
  admin:     { bg: 'rgba(245,158,66,0.1)',   color: 'var(--orange)' },
  developer: { bg: 'rgba(79,124,255,0.12)',  color: 'var(--accent)' },
  user:      { bg: 'var(--surface3)',         color: 'var(--text3)' },
};

interface BanModalProps {
  target: PublicUser;
  onClose: () => void;
  onDone: () => void;
}

function BanModal({ target, onClose, onDone }: BanModalProps) {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [duration, setDuration] = useState('1'); // days, 0 = permanent
  const [reason,   setReason]   = useState('');
  const [loading,  setLoading]  = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/users/${target.uid}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ durationDays: Number(duration), reason: reason.trim() }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) {
        addToast(Number(duration) === 0 ? `${target.name} permanently banned` : `${target.name} suspended for ${duration} day(s)`, 'success');
        onDone(); onClose();
      } else { addToast(json.error ?? 'Failed', 'error'); }
    } catch { addToast('Network error', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
          Ban / Suspend User
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
          Acting on: <strong style={{ color: 'var(--text)' }}>{target.name}</strong>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Duration (days) — 0 = permanent ban
            </label>
            <input className="form-input" type="number" min={0} max={365}
              value={duration} onChange={e => setDuration(e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Reason
            </label>
            <textarea className="form-textarea" rows={2} placeholder="Reason for ban…"
              value={reason} onChange={e => setReason(e.target.value)} maxLength={200} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={submit} disabled={loading}>
            {loading ? 'Applying…' : Number(duration) === 0 ? 'Permanent Ban' : `Suspend ${duration}d`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users,      setUsers]      = useState<PublicUser[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [banTarget,  setBanTarget]  = useState<PublicUser | null>(null);
  const { user: me, token } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const canModerate = me?.role === 'admin' || me?.role === 'owner';

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/users?limit=100`);
      const json = await res.json() as { ok: boolean; data?: { users: PublicUser[] } };
      if (json.ok && json.data) setUsers(json.data.users);
    } catch { addToast('Could not load users', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleUnban = async (u: PublicUser) => {
    try {
      const res  = await fetch(`${API}/users/${u.uid}/ban`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) { addToast(`${u.name} unbanned`, 'success'); loadUsers(); }
      else          { addToast(json.error ?? 'Failed', 'error'); }
    } catch { addToast('Network error', 'error'); }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="browser-page">
      {/* Topbar */}
      <div className="topbar">
        <h1 className="topbar-title">Community</h1>
        <div className="topbar-search" style={{ marginLeft: 'auto' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" placeholder="Search users…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="page-content">
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
          {users.length} member{users.length !== 1 ? 's' : ''} in the community
        </p>

        {loading ? (
          <div className="cards-grid">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty"><h3>No users found</h3></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(u => {
              const rs     = ROLE_STYLE[u.role] ?? ROLE_STYLE.user;
              const isBanned = u.banned;
              return (
                <div key={u.uid} style={{
                  background: 'var(--surface)',
                  border: `1px solid ${isBanned ? 'rgba(240,82,82,0.25)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  transition: 'border-color 120ms',
                }}>
                  {/* Avatar */}
                  <img src={u.avatar} alt={u.name}
                    style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, cursor: 'pointer' }}
                    onClick={() => navigate(`/profile/${u.uid}`)}
                    onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`; }}
                  />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                    onClick={() => navigate(`/profile/${u.uid}`)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        background: rs.bg, color: rs.color }}>{u.role}</span>
                      {isBanned && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                          textTransform: 'uppercase', background: 'var(--red-dim)', color: 'var(--red)' }}>
                          {u.bannedUntil ? 'suspended' : 'banned'}
                        </span>
                      )}
                    </div>
                    {u.bio && <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.bio}</p>}
                    {isBanned && u.banReason && (
                      <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>Reason: {u.banReason}</p>
                    )}
                  </div>

                  {/* Joined */}
                  <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0, display: 'none' }}
                    className="joined-date">
                    Joined {new Date(u.createdAt).toLocaleDateString()}
                  </span>

                  {/* Mod actions */}
                  {canModerate && u.uid !== me?.uid && u.role !== 'owner' && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {isBanned ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleUnban(u)}>
                          Unban
                        </button>
                      ) : (
                        <button className="btn btn-danger btn-sm" onClick={() => setBanTarget(u)}>
                          Ban
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {banTarget && (
        <BanModal target={banTarget} onClose={() => setBanTarget(null)} onDone={loadUsers} />
      )}
    </div>
  );
}
