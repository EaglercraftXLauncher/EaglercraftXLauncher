/**
 * AdminDashboard.tsx
 * Visible only to admin and owner.
 * Owner can: generate admin passes, revoke passes, see all passes.
 * Admin can: see content, archive content (no pass management).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const API = '/api';

interface AdminPass {
  code:      string;
  label?:    string;
  used:      boolean;
  usedBy?:   string;
  createdAt: string;
  usedAt?:   string;
}

type DashTab = 'passes' | 'users' | 'content';

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const navigate        = useNavigate();
  const { addToast }    = useToast();
  const [tab, setTab]   = useState<DashTab>('passes');

  // Pass management state
  const [passes,       setPasses]       = useState<AdminPass[]>([]);
  const [passLabel,    setPassLabel]    = useState('');
  const [passLoading,  setPassLoading]  = useState(false);
  const [generating,   setGenerating]   = useState(false);
  const [newCode,      setNewCode]      = useState<string | null>(null);
  const [copied,       setCopied]       = useState(false);

  // Redirect if not admin/owner
  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'owner') {
      navigate('/');
    }
  }, [user, navigate]);

  const loadPasses = useCallback(async () => {
    if (user?.role !== 'owner') return;
    setPassLoading(true);
    try {
      const res  = await fetch(`${API}/roles/admin-passes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { ok: boolean; data?: { passes: AdminPass[] } };
      if (json.ok && json.data) setPasses(json.data.passes);
    } catch { addToast('Could not load passes', 'error'); }
    finally { setPassLoading(false); }
  }, [user, token]);

  useEffect(() => {
    if (tab === 'passes') loadPasses();
  }, [tab, loadPasses]);

  const generatePass = async () => {
    setGenerating(true);
    setNewCode(null);
    try {
      const res  = await fetch(`${API}/roles/admin-passes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label: passLabel.trim() || undefined }),
      });
      const json = await res.json() as { ok: boolean; data?: { code: string }; error?: string };
      if (json.ok && json.data) {
        setNewCode(json.data.code);
        setPassLabel('');
        await loadPasses();
        addToast('Pass generated', 'success');
      } else {
        addToast(json.error ?? 'Failed to generate pass', 'error');
      }
    } catch { addToast('Network error', 'error'); }
    finally { setGenerating(false); }
  };

  const revokePass = async (code: string) => {
    try {
      const res  = await fetch(`${API}/roles/admin-passes/${code}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) { await loadPasses(); addToast('Pass revoked', 'success'); }
      else          { addToast(json.error ?? 'Failed', 'error'); }
    } catch { addToast('Network error', 'error'); }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
    return <div className="page-content" style={{ color: 'var(--text3)', padding: 40 }}>Access denied.</div>;
  }

  const isOwner = user.role === 'owner';

  return (
    <div className="page-content" style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              background: isOwner ? 'rgba(52,217,149,0.12)' : 'rgba(245,158,66,0.1)',
              color: isOwner ? 'var(--green)' : 'var(--orange)',
              padding: '2px 8px', borderRadius: 4 }}>
              {user.role}
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700 }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>
            {isOwner ? 'Full platform control.' : 'Content moderation tools.'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
        {(isOwner ? ['passes', 'content'] : ['content']).map(t => (
          <button key={t} onClick={() => setTab(t as DashTab)}
            style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer',
              background: tab === t ? 'var(--surface2)' : 'transparent',
              color: tab === t ? 'var(--text)' : 'var(--text2)',
              fontWeight: tab === t ? 600 : 400,
              fontSize: 13, borderRadius: '6px 6px 0 0', textTransform: 'capitalize',
            }}>{t}</button>
        ))}
      </div>

      {/* ── Passes tab (owner only) ── */}
      {tab === 'passes' && isOwner && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Generate */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Generate Admin Pass</h2>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>
              Each pass is single-use. Share it privately with the person you want to promote.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <input className="form-input" placeholder="Optional label (e.g. 'For Alice')"
                value={passLabel} onChange={e => setPassLabel(e.target.value)}
                style={{ flex: 1 }} maxLength={60} />
              <button className="btn btn-primary" onClick={generatePass} disabled={generating}>
                {generating ? 'Generating…' : 'Generate'}
              </button>
            </div>

            {/* Newly generated code */}
            {newCode && (
              <div style={{ marginTop: 16, background: 'var(--surface2)', border: '1px solid var(--border2)',
                borderRadius: 'var(--radius)', padding: 14 }}>
                <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  New pass code — copy now, it won't be shown again
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <code style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--green)',
                    background: 'var(--surface3)', padding: '8px 12px', borderRadius: 'var(--radius)',
                    wordBreak: 'break-all' }}>
                    {newCode}
                  </code>
                  <button className="btn btn-ghost btn-sm" onClick={() => copyCode(newCode)}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pass list */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700 }}>All Passes</h2>
              <button className="btn btn-ghost btn-sm" onClick={loadPasses} disabled={passLoading}>
                {passLoading ? 'Loading…' : 'Refresh'}
              </button>
            </div>
            {passes.length === 0 ? (
              <p style={{ padding: '28px', color: 'var(--text3)', fontSize: 13, textAlign: 'center' }}>
                No passes generated yet.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Code', 'Label', 'Status', 'Created', ''].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text3)',
                        fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {passes.map(p => (
                    <tr key={p.code} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text2)' }}>
                        {p.code.slice(0, 8)}…
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text2)' }}>{p.label ?? '—'}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                          background: p.used ? 'rgba(240,82,82,0.1)' : 'rgba(52,217,149,0.1)',
                          color: p.used ? 'var(--red)' : 'var(--green)',
                          textTransform: 'uppercase',
                        }}>{p.used ? 'used' : 'available'}</span>
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text3)', fontSize: 11 }}>
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {!p.used && (
                          <button className="btn btn-danger btn-sm"
                            onClick={() => revokePass(p.code)}>
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Content tab ── */}
      {tab === 'content' && (
        <div style={{ color: 'var(--text2)', fontSize: 13, padding: 20,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <p>Content moderation tools — browse uploaded clients, mods, and skins from the main library
          and use the Archive / Delete actions that appear when you are signed in as admin or owner.</p>
        </div>
      )}
    </div>
  );
}
