import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import type { ContentKind, ClientManifest, ContentVersion, AutoSyncConfig } from '../types';

const API = '/api';
const CAN_UPLOAD = new Set(['developer', 'admin', 'owner']);

// Icons
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2v-14a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const BackIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
);

interface Props { kind: ContentKind }

type Tab = 'view' | 'versions' | 'screenshots' | 'docs' | 'sync' | 'settings';

export default function ClientDetailPage({ kind }: Props) {
  const { contentId } = useParams<{ contentId: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { addToast } = useToast();

  const [manifest, setManifest] = useState<ClientManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('versions');

  // Version Edit Modal
  const [editingVersion, setEditingVersion] = useState<ContentVersion | null>(null);
  const [editTag, setEditTag] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editChangelog, setEditChangelog] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Metadata Edit
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Multi Sync
  const [syncConfigs, setSyncConfigs] = useState<AutoSyncConfig[]>([]);
  const [newSyncUrl, setNewSyncUrl] = useState('');
  const [newSyncTag, setNewSyncTag] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [savingSync, setSavingSync] = useState(false);

  const canEdit = !!user && CAN_UPLOAD.has(user.role);
  const endpoint = kind === 'client' ? 'clients' : kind === 'mod' ? 'mods' : 'skins';

  const assetUrl = (filename: string) =>
    `${API}/content/${contentId}/asset?path=${encodeURIComponent(filename)}`;

  const loadManifest = useCallback(async () => {
    if (!contentId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/${endpoint}/${contentId}`);
      const json = await res.json() as { ok: boolean; data?: ClientManifest };
      if (json.ok && json.data) {
        setManifest(json.data);
        const configs = json.data.autoSyncs ?? (json.data.autoSync ? [json.data.autoSync] : []);
        setSyncConfigs(configs);
      } else {
        addToast('Content not found', 'error');
        navigate(-1);
      }
    } catch {
      addToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  }, [contentId, endpoint, addToast, navigate]);

  useEffect(() => {
    loadManifest();
  }, [loadManifest]);

  // Version Edit
  const openVersionEditor = (v: ContentVersion) => {
    setEditingVersion(v);
    setEditTag(v.tag);
    setEditLabel(v.label || v.tag);
    setEditChangelog(v.changelog || '');
  };

  const saveVersionEdit = async () => {
    if (!editingVersion || !contentId) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`${API}/${endpoint}/${contentId}/versions/${encodeURIComponent(editingVersion.tag)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tag: editTag.trim(),
          label: editLabel.trim(),
          changelog: editChangelog.trim()
        }),
      });
      const json = await res.json();
      if (json.ok) {
        addToast('Version updated successfully', 'success');
        setEditingVersion(null);
        loadManifest();
      } else {
        addToast(json.error || 'Failed to update', 'error');
      }
    } catch {
      addToast('Network error', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Metadata Edit
  const saveMetadata = async () => {
    if (!contentId) return;
    try {
      const res = await fetch(`${API}/${endpoint}/${contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editName.trim() || manifest?.name,
          description: editDesc.trim() || manifest?.description,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        addToast('Settings saved', 'success');
        loadManifest();
      } else addToast(json.error || 'Failed', 'error');
    } catch {
      addToast('Network error', 'error');
    }
  };

  // Multi Sync
  const addSyncConfig = async () => {
    if (!newSyncUrl.trim() || !newSyncTag.trim()) {
      addToast('URL and Version are required', 'error');
      return;
    }
    setSavingSync(true);
    try {
      const body = { sourceUrl: newSyncUrl.trim(), versionTag: newSyncTag.trim(), enabled: true };
      const res = await fetch(`${API}/${endpoint}/${contentId}/sync`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.ok) {
        addToast('Sync config added', 'success');
        setNewSyncUrl('');
        setNewSyncTag('');
        loadManifest();
      } else addToast(json.error || 'Failed', 'error');
    } catch {
      addToast('Network error', 'error');
    } finally {
      setSavingSync(false);
    }
  };

  const removeSync = async (versionTag: string) => {
    try {
      const res = await fetch(`${API}/${endpoint}/${contentId}/sync?versionTag=${encodeURIComponent(versionTag)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.ok) {
        addToast('Sync removed', 'success');
        loadManifest();
      }
    } catch {
      addToast('Network error', 'error');
    }
  };

  const triggerSync = async (versionTag?: string) => {
    setSyncing(true);
    try {
      const url = versionTag
        ? `${API}/${endpoint}/${contentId}/sync?versionTag=${encodeURIComponent(versionTag)}`
        : `${API}/${endpoint}/${contentId}/sync`;
      const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.ok) addToast('Sync completed', 'success');
      else addToast(json.error || 'Sync failed', 'error');
      loadManifest();
    } catch {
      addToast('Network error', 'error');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (!manifest) return <div>Content not found</div>;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'versions', label: `Versions (${manifest.versions.length})` },
    { id: 'sync', label: 'Auto-Sync' },
    ...(canEdit ? [{ id: 'settings' as Tab, label: 'Settings' }] : []),
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Banner */}
      {manifest.bannerUrl && (
        <div style={{ height: 220, overflow: 'hidden', position: 'relative' }}>
          <img src={manifest.bannerUrl} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '20px 24px' }}>
        <button
          onClick={() => navigate(`/${endpoint}`)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}
        >
          <BackIcon /> Back to {endpoint}
        </button>

        <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
          {manifest.faviconUrl && <img src={manifest.faviconUrl} alt="" style={{ width: 64, height: 64, borderRadius: 12 }} />}
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: '0 0 6px 0' }}>{manifest.name}</h1>
            <p>by {manifest.author} • Updated {new Date(manifest.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>

        <p style={{ marginBottom: 32, lineHeight: 1.6, color: 'var(--text2)' }}>{manifest.description}</p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #333', marginBottom: 24 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 18px',
                background: tab === t.id ? '#222' : 'transparent',
                border: 'none',
                borderBottom: tab === t.id ? '3px solid #0ea5e9' : '3px solid transparent',
                color: tab === t.id ? '#fff' : '#aaa',
                fontWeight: tab === t.id ? 600 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Versions Tab */}
        {tab === 'versions' && (
          <div>
            {manifest.versions.map(v => (
              <div key={v.tag} style={{ background: '#1a1a1a', padding: 20, borderRadius: 10, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: 18 }}>{v.tag}</strong>
                  {v.label && <span style={{ marginLeft: 8, color: '#888' }}>({v.label})</span>}
                  {v.changelog && <p style={{ marginTop: 8, fontSize: 14, color: '#bbb' }}>{v.changelog}</p>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <a href={assetUrl(v.filename)} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                    Download
                  </a>
                  {canEdit && (
                    <button onClick={() => openVersionEditor(v)} className="btn btn-ghost">
                      <EditIcon /> Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Auto-Sync Tab */}
        {tab === 'sync' && (
          <div>
            {syncConfigs.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h3>Active Auto-Syncs</h3>
                {syncConfigs.map((c, i) => (
                  <div key={i} style={{ background: '#1f1f1f', padding: 18, borderRadius: 10, marginBottom: 12 }}>
                    <p><strong>Version:</strong> {c.versionTag}</p>
                    <p><strong>Source URL:</strong> <code style={{ wordBreak: 'break-all' }}>{c.sourceUrl}</code></p>
                    {c.lastSyncAt && <p>Last sync: {new Date(c.lastSyncAt).toLocaleString()} {c.lastSyncOk ? '✅' : '❌'}</p>}
                    <div style={{ marginTop: 12 }}>
                      <button onClick={() => triggerSync(c.versionTag)} className="btn btn-primary" disabled={syncing}>Sync Now</button>
                      <button onClick={() => removeSync(c.versionTag)} style={{ marginLeft: 12, color: '#ff6666' }}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {canEdit && (
              <div style={{ background: '#1f1f1f', padding: 24, borderRadius: 12 }}>
                <h3>Add New Auto-Sync</h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <input
                    className="form-input"
                    placeholder="https://example.com/latest.jar"
                    value={newSyncUrl}
                    onChange={(e) => setNewSyncUrl(e.target.value)}
                    style={{ flex: 1, minWidth: 280 }}
                  />
                  <select className="form-select" value={newSyncTag} onChange={(e) => setNewSyncTag(e.target.value)} style={{ minWidth: 160 }}>
                    <option value="">Select Version</option>
                    {manifest.versions.map(v => <option key={v.tag} value={v.tag}>{v.tag}</option>)}
                  </select>
                  <button className="btn btn-primary" onClick={addSyncConfig} disabled={savingSync}>Add Sync</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && canEdit && (
          <div style={{ background: '#1f1f1f', padding: 24, borderRadius: 12 }}>
            <h3>Edit Metadata</h3>
            <input
              className="form-input"
              placeholder="Name"
              value={editName || manifest.name}
              onChange={e => setEditName(e.target.value)}
            />
            <textarea
              className="form-textarea"
              placeholder="Description"
              value={editDesc || manifest.description}
              onChange={e => setEditDesc(e.target.value)}
              rows={5}
            />
            <button className="btn btn-primary" onClick={saveMetadata} style={{ marginTop: 16 }}>Save Changes</button>
          </div>
        )}
      </div>

      {/* Version Edit Modal */}
      {editingVersion && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a1a', padding: 28, borderRadius: 12, width: '90%', maxWidth: 500 }}>
            <h3>Edit Version "{editingVersion.tag}"</h3>
            <input className="form-input" value={editTag} onChange={e => setEditTag(e.target.value)} placeholder="Tag" />
            <input className="form-input" value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="Label (optional)" />
            <textarea className="form-textarea" rows={6} value={editChangelog} onChange={e => setEditChangelog(e.target.value)} placeholder="Changelog..." />
            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" onClick={saveVersionEdit} disabled={savingEdit}>Save Changes</button>
              <button className="btn btn-ghost" onClick={() => setEditingVersion(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
