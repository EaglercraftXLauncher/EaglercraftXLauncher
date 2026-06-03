import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const API = '/api';

interface PublicUser {
  uid: string;
  name: string;
  bio: string;
  avatar: string;
  role: string;
  gravatarEmail: string;
  createdAt: string;
}

const ProfilePage: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const { user: currentUser, token } = useAuth();
  const { addToast } = useToast();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', gravatarEmail: '' });

  const isOwn = currentUser?.uid === uid;

  useEffect(() => {
    fetch(`${API}/users/${uid}`)
      .then(r => r.json() as Promise<{ data?: PublicUser } & PublicUser>)
      .then(j => {
        const d: PublicUser = j.data ?? j;
        setProfile(d);
        setForm({ name: d.name ?? '', bio: d.bio ?? '', gravatarEmail: d.gravatarEmail ?? '' });
      })
      .catch(() => addToast('Could not load profile', 'error'))
      .finally(() => setIsLoading(false));
  }, [uid]);

  const handleSave = async () => {
    try {
      const res = await fetch(`${API}/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const j = await res.json() as { data?: PublicUser } & PublicUser;
        const d: PublicUser = j.data ?? j;
        setProfile(d);
        setEditing(false);
        addToast('Profile saved', 'success');
      } else {
        addToast('Save failed', 'error');
      }
    } catch {
      addToast('Network error', 'error');
    }
  };

  if (isLoading) return <div style={{ padding: 40, color: 'var(--text3)' }}>Loading…</div>;
  if (!profile)  return <div style={{ padding: 40, color: 'var(--text3)' }}>Profile not found.</div>;

  return (
    <div className="page-content">
      <div className="profile-hero">
        <img src={profile.avatar} alt={profile.name} className="profile-avatar"
          onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}`; }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="form-input" placeholder="Name" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <textarea className="form-textarea" placeholder="Bio" value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
              <input className="form-input" placeholder="Gravatar email" value={form.gravatarEmail}
                onChange={e => setForm(f => ({ ...f, gravatarEmail: e.target.value }))} />
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn btn-primary" onClick={handleSave}>Save</button>
                <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="profile-name">{profile.name}</div>
              {profile.bio && <div className="profile-bio">{profile.bio}</div>}
              <div className="profile-meta">
                <span className="profile-meta-item">Role: {profile.role}</span>
                <span className="profile-meta-item">Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
              </div>
              {isOwn && (
                <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => setEditing(true)}>
                  Edit profile
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
