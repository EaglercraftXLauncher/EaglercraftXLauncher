/**
 * SettingsPage.tsx
 * - All users: profile editing
 * - "user" role: Developer Mode unlock (3 gated questions)
 * - All roles: Owner claim via password
 * - Admin/Owner: Admin pass redemption (also available in search)
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const API = '/api';

interface DevQuestion { questions: string[] }

type Section = 'profile' | 'developer' | 'danger';

export default function SettingsPage() {
  const { user, token, refresh } = useAuth();
  const { addToast } = useToast();
  const [section, setSection] = useState<Section>('profile');

  // Profile form
  const [name,           setName]           = useState(user?.name ?? '');
  const [bio,            setBio]            = useState('');
  const [gravatarEmail,  setGravatarEmail]  = useState('');
  const [savingProfile,  setSavingProfile]  = useState(false);

  // Developer form
  const [devQuestions,   setDevQuestions]   = useState<string[]>([]);
  const [devAnswers,     setDevAnswers]     = useState(['', '', '']);
  const [devLoading,     setDevLoading]     = useState(false);
  const [devFetched,     setDevFetched]     = useState(false);

  // Owner claim
  const [ownerPass,      setOwnerPass]      = useState('');
  const [ownerLoading,   setOwnerLoading]   = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
    }
  }, [user]);

  // ── Profile save ──────────────────────────────────────────
  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch(`${API}/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, bio, gravatarEmail }),
      });
      if (res.ok) { await refresh(); addToast('Profile saved', 'success'); }
      else        { addToast('Save failed', 'error'); }
    } catch { addToast('Network error', 'error'); }
    finally { setSavingProfile(false); }
  };

  // ── Load dev questions ────────────────────────────────────
  const fetchDevQuestions = async () => {
    setDevLoading(true);
    try {
      const res  = await fetch(`${API}/roles/dev-questions`);
      const json = await res.json() as { ok: boolean; data?: DevQuestion };
      if (json.ok && json.data) {
        setDevQuestions(json.data.questions);
        setDevFetched(true);
      }
    } catch { addToast('Could not load questions', 'error'); }
    finally { setDevLoading(false); }
  };

  // ── Submit dev answers ────────────────────────────────────
  const submitDevAnswers = async () => {
    if (devAnswers.some(a => !a.trim())) {
      addToast('Please answer all three questions', 'error'); return;
    }
    setDevLoading(true);
    try {
      const res  = await fetch(`${API}/roles/claim-developer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ a1: devAnswers[0], a2: devAnswers[1], a3: devAnswers[2] }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) {
        await refresh();
        addToast('Developer mode enabled! You can now upload clients.', 'success');
      } else {
        addToast(json.error ?? 'Incorrect answers', 'error');
      }
    } catch { addToast('Network error', 'error'); }
    finally { setDevLoading(false); }
  };

  // ── Claim owner ───────────────────────────────────────────
  const claimOwner = async () => {
    if (!ownerPass.trim()) return;
    setOwnerLoading(true);
    try {
      const res  = await fetch(`${API}/roles/claim-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: ownerPass }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) {
        await refresh();
        addToast('You are now the owner.', 'success');
        setOwnerPass('');
      } else {
        addToast(json.error ?? 'Incorrect password', 'error');
      }
    } catch { addToast('Network error', 'error'); }
    finally { setOwnerLoading(false); }
  };

  const roleColor: Record<string, string> = {
    user: 'var(--text3)', developer: 'var(--accent)',
    admin: 'var(--orange)', owner: 'var(--green)',
  };

  if (!user) return (
    <div className="page-content" style={{ padding: 40, color: 'var(--text3)' }}>
      Please sign in to access settings.
    </div>
  );

  return (
    <div className="page-content" style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700 }}>Settings</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 6 }}>
          Current role:&nbsp;
          <strong style={{ color: roleColor[user.role] ?? 'var(--text)', textTransform: 'capitalize' }}>
            {user.role}
          </strong>
        </p>
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {(['profile', 'developer', 'danger'] as Section[]).map(s => (
          <button
            key={s}
            onClick={() => setSection(s)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px 6px 0 0',
              border: 'none',
              background: section === s ? 'var(--surface2)' : 'transparent',
              color: section === s ? 'var(--text)' : 'var(--text2)',
              fontWeight: section === s ? 600 : 400,
              fontSize: 13,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >{s}</button>
        ))}
      </div>

      {/* ── Profile section ── */}
      {section === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Display name">
            <input className="form-input" value={name}
              onChange={e => setName(e.target.value)} maxLength={50} />
          </Field>
          <Field label="Bio">
            <textarea className="form-textarea" value={bio}
              onChange={e => setBio(e.target.value)} maxLength={300} rows={3} />
          </Field>
          <Field label="Gravatar email" hint="Used to resolve your avatar from gravatar.com">
            <input className="form-input" type="email" value={gravatarEmail}
              onChange={e => setGravatarEmail(e.target.value)} />
          </Field>
          <button className="btn btn-primary" onClick={saveProfile} disabled={savingProfile}
            style={{ alignSelf: 'flex-start' }}>
            {savingProfile ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      )}

      {/* ── Developer section ── */}
      {section === 'developer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {user.role !== 'user' ? (
            <InfoBox color="var(--green)">
              ✓ Your role (<strong>{user.role}</strong>) already has upload access.
              Developer mode is not needed.
            </InfoBox>
          ) : (
            <>
              <InfoBox color="var(--accent)">
                Developer mode lets you upload clients, mods, and skins to the platform.
                To unlock it, answer the three questions below correctly.
                These questions are designed to verify you understand the Eaglercraft ecosystem.
              </InfoBox>

              {!devFetched ? (
                <button className="btn btn-ghost" onClick={fetchDevQuestions} disabled={devLoading}
                  style={{ alignSelf: 'flex-start' }}>
                  {devLoading ? 'Loading…' : 'Show developer questions'}
                </button>
              ) : (
                <>
                  {devQuestions.map((q, i) => (
                    <Field key={i} label={`Question ${i + 1}: ${q}`}>
                      <input className="form-input" value={devAnswers[i]}
                        onChange={e => {
                          const next = [...devAnswers];
                          next[i] = e.target.value;
                          setDevAnswers(next);
                        }}
                        placeholder="Your answer…" />
                    </Field>
                  ))}
                  <button className="btn btn-primary" onClick={submitDevAnswers}
                    disabled={devLoading} style={{ alignSelf: 'flex-start' }}>
                    {devLoading ? 'Checking…' : 'Submit answers'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Danger / Owner section ── */}
      {section === 'danger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {user.role !== 'owner' && (
            <div style={{ background: 'var(--surface)', border: '1px solid rgba(240,82,82,0.3)', borderRadius: 'var(--radius)', padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--red)' }}>
                Claim Owner Role
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>
                Enter the owner password. Only one owner can exist.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <input className="form-input" type="password" placeholder="Owner password"
                  value={ownerPass} onChange={e => setOwnerPass(e.target.value)}
                  style={{ flex: 1 }} />
                <button className="btn btn-danger" onClick={claimOwner} disabled={ownerLoading || !ownerPass.trim()}>
                  {ownerLoading ? 'Claiming…' : 'Claim'}
                </button>
              </div>
            </div>
          )}
          {user.role === 'owner' && (
            <InfoBox color="var(--green)">✓ You are the owner of this platform.</InfoBox>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: 'var(--text3)' }}>{hint}</p>}
    </div>
  );
}

function InfoBox({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${color}33`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 'var(--radius)',
      padding: '14px 16px',
      fontSize: 13,
      color: 'var(--text2)',
      lineHeight: 1.6,
    }}>{children}</div>
  );
}
