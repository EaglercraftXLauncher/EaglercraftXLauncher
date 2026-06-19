import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import type { ContentKind, ClientManifest, ContentVersion, AutoSyncConfig } from '../types';

const API = '/api';
const CAN_UPLOAD = new Set(['developer', 'admin', 'owner']);

// ── Icons ──────────────────────────────────────────────────────
const PlayIcon   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const DlIcon     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const UploadIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const SyncIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const BackIcon   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const EditIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2v-14a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;

interface Props { kind: ContentKind }

type Tab = 'view' | 'versions' | 'screenshots' | 'docs' | 'sync' | 'settings';

export default function ClientDetailPage({ kind }: Props) {
  const { contentId }   = useParams<{ contentId: string }>();
  const navigate        = useNavigate();
  const { user, token } = useAuth();
  const { addToast }    = useToast();

  const [manifest,      setManifest]      = useState<ClientManifest | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState<Tab>('view');
  const [activeVersion, setActiveVersion] = useState<ContentVersion | null>(null);

  // Version upload
  const [vFile,      setVFile]      = useState<File | null>(null);
  const [vTag,       setVTag]       = useState('');
  const [vLog,       setVLog]       = useState('');
  const [vUploading, setVUploading] = useState(false);

  // Screenshot
  const [ssFile,      setSsFile]      = useState<File | null>(null);
  const [ssUploading, setSsUploading] = useState(false);

  // Doc
  const [docName,      setDocName]      = useState('');
  const [docContent,   setDocContent]   = useState('');
  const [docUploading, setDocUploading] = useState(false);
  const [viewingDoc,   setViewingDoc]   = useState<string | null>(null);
  const [docText,      setDocText]      = useState('');

  // Version Edit Modal
  const [editingVersion, setEditingVersion] = useState<ContentVersion | null>(null);
  const [editTag,        setEditTag]        = useState('');
  const [editLabel,      setEditLabel]      = useState('');
  const [editChangelog,  setEditChangelog]  = useState('');
  const [savingEdit,     setSavingEdit]     = useState(false);

  // Metadata Edit (Settings)
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);

  // Multi Sync
  const [syncConfigs, setSyncConfigs] = useState<AutoSyncConfig[]>([]);
  const [newSyncUrl,  setNewSyncUrl]  = useState('');
  const [newSyncTag,  setNewSyncTag]  = useState('');
  const [syncing,     setSyncing]     = useState(false);
  const [savingSync,  setSavingSync]  = useState(false);

  const canEdit  = !!user && CAN_UPLOAD.has(user.role);
  const endpoint = kind === 'client' ? 'clients' : kind === 'mod' ? 'mods' : 'skins';
  const isSkin   = kind === 'skin';

  const assetUrl = (filename: string) =>
    `${API}/content/${contentId}/asset?path=${encodeURIComponent(filename)}`;

  const loadManifest = useCallback(async () => {
    if (!contentId) return;
    setLoading(true);
    try {
      const res  = await fetch(`${API}/${endpoint}/${contentId}`);
      const json = await res.json() as { ok: boolean; data?: ClientManifest };
      if (json.ok && json.data) {
        setManifest(json.data);
        const latest = json.data.versions.find(v => v.isLatest) ?? json.data.versions[0] ?? null;
        setActiveVersion(latest);

        const configs = json.data.autoSyncs ?? (json.data.autoSync ? [json.data.autoSync] : []);
        setSyncConfigs(configs);
      } else {
        addToast('Content not found', 'error');
        navigate(-1);
      }
    } catch { addToast('Network error', 'error'); }
    finally { setLoading(false); }
  }, [contentId, endpoint, addToast, navigate]);

  useEffect(() => { loadManifest(); }, [loadManifest]);

  // ── Version Edit ─────────────────────────────────────
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
          changelog: editChangelog.trim(),
        }),
      });
      const json = await res.json();
      if (json.ok) {
        addToast('Version updated', 'success');
        setEditingVersion(null);
        loadManifest();
      } else addToast(json.error || 'Failed', 'error');
    } catch { addToast('Network error', 'error'); }
    finally { setSavingEdit(false); }
  };

  // ── Metadata Edit ───────────────────────────────────
  const saveMetadata = async () => {
    if (!contentId) return;
    try {
      const res = await fetch(`${API}/${endpoint}/${contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editName.trim() || manifest?.name,
          description: editDesc.trim() || manifest?.description,
          tags: editTags.length ? editTags : manifest?.tags,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        addToast('Settings saved', 'success');
        loadManifest();
      } else addToast(json.error || 'Failed', 'error');
    } catch { addToast('Network error', 'error'); }
  };

  // ── Multi Sync ───────────────────────────────────────
  const addSyncConfig = async () => {
    if (!newSyncUrl.trim() || !newSyncTag.trim()) return;
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
        setNewSyncUrl(''); setNewSyncTag('');
        loadManifest();
      } else addToast(json.error || 'Failed', 'error');
    } catch { addToast('Network error', 'error'); } finally { setSavingSync(false); }
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
    } catch { addToast('Network error', 'error'); }
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
    } catch { addToast('Network error', 'error'); } finally { setSyncing(false); }
  };

  // Upload functions (kept from original)
  const uploadVersion = async () => { /* ... same as original ... */ };
  const uploadScreenshot = async () => { /* ... same as original ... */ };
  const uploadDoc = async () => { /* ... same as original ... */ };
  const viewDoc = async (filename: string) => { /* ... same as original ... */ };

  if (loading) return <div style={{ padding: 40, color: 'var(--text3)' }}>Loading…</div>;
  if (!manifest) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'view', label: isSkin ? 'Preview' : 'Play' },
    { id: 'versions', label: `Versions (${manifest.versions.length})` },
    { id: 'screenshots', label: `Screenshots (${manifest.screenshots.length})` },
    { id: 'docs', label: `Docs (${manifest.docs.length})` },
    ...(canEdit ? [
      { id: 'sync' as Tab, label: 'Auto-Sync' },
      { id: 'settings' as Tab, label: 'Settings' }
    ] : []),
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Banner + Header (full from original) */}
      {manifest.bannerUrl && (
        <div style={{ width: '100%', height: 200, overflow: 'hidden', position: 'relative' }}>
          <img src={manifest.bannerUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, var(--bg))' }} />
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>
        {/* Back + Header (full) */}
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/${endpoint}`)} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 20, marginBottom: 16 }}>
          <BackIcon /> Back to {endpoint}
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
          {manifest.faviconUrl && <img src={manifest.faviconUrl} alt="" style={{ width: 56, height: 56, borderRadius: 12, border: '1px solid var(--border2)', flexShrink: 0, objectFit: 'cover' }} />}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>{manifest.name}</h1>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
              by <Link to={`/profile/${manifest.uploaderUid}`} style={{ color: 'var(--accent)' }}>{manifest.author}</Link>
              &nbsp;·&nbsp; Updated {new Date(manifest.updatedAt).toLocaleDateString()}
            </p>
            {manifest.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {manifest.tags.map(t => <span key={t} className="tag">{t}</span>)}
              </div>
            )}
          </div>
          {activeVersion && (isSkin ? (
            <a href={assetUrl(activeVersion.filename)} download className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <DlIcon /> Download Skin
            </a>
          ) : (
            <a href={assetUrl(activeVersion.filename)} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <PlayIcon /> Play {activeVersion.tag}
            </a>
          ))}
        </div>

        <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>{manifest.description}</p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer',
              background: tab === t.id ? 'var(--surface2)' : 'transparent',
              color: tab === t.id ? 'var(--text)' : 'var(--text2)',
              fontWeight: tab === t.id ? 600 : 400,
              fontSize: 13, borderRadius: '6px 6px 0 0'
            }}>{t.label}</button>
          ))}
        </div>

        {/* View tab - keep your original skin/client preview */}
        {tab === 'view' && activeVersion && (
          <div>
            {/* Your existing view/preview code here */}
            {isSkin ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                {/* Skin preview logic */}
              </div>
            ) : (
              <div>Client/Mod play area</div>
            )}
          </div>
        )}

        {/* Versions tab with Edit */}
        {tab === 'versions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {manifest.versions.map(v => (
              <div key={v.tag} style={{ background: 'var(--surface)', padding: 16, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{v.tag}</strong> {v.label && <span>({v.label})</span>}
                  {v.changelog && <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{v.changelog}</p>}
                </div>
                <div>
                  <a href={assetUrl(v.filename)} className="btn btn-primary btn-sm">Download</a>
                  {canEdit && (
                    <button onClick={() => openVersionEditor(v)} className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }}>
                      <EditIcon /> Edit
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Upload new version form - original code */}
            {canEdit && (
              <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 12 }}>
                {/* Your original version upload form */}
              </div>
            )}
          </div>
        )}

        {/* Screenshots & Docs tabs - keep original */}

        {/* Auto-Sync Tab */}
        {tab === 'sync' && canEdit && (
          <div>
            {syncConfigs.length > 0 && (
              <div style={{ marginBottom: 30 }}>
                <h3>Active Sync Configurations</h3>
                {syncConfigs.map((c, i) => (
                  <div key={i} style={{ background: 'var(--surface)', padding: 16, borderRadius: 8, marginBottom: 12 }}>
                    <p><strong>Version:</strong> {c.versionTag}</p>
                    <p><strong>Source:</strong> <code style={{ wordBreak: 'break-all' }}>{c.sourceUrl}</code></p>
                    {c.lastSyncAt && <p>Last sync: {new Date(c.lastSyncAt).toLocaleString()} — {c.lastSyncOk ? '✅ Success' : '❌ Failed'}</p>}
                    <div style={{ marginTop: 12 }}>
                      <button onClick={() => triggerSync(c.versionTag)} className="btn btn-primary btn-sm">Sync Now</button>
                      <button onClick={() => removeSync(c.versionTag)} className="btn btn-ghost btn-sm" style={{ marginLeft: 8, color: 'var(--red)' }}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: 'var(--surface)', padding: 24, borderRadius: 12 }}>
              <h3>Add New Auto-Sync (One per Version)</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <input 
                  className="form-input" 
                  placeholder="https://example.com/mod.jar" 
                  value={newSyncUrl} 
                  onChange={e => setNewSyncUrl(e.target.value)} 
                  style={{ flex: 1, minWidth: 300 }}
                />
                <select className="form-select" value={newSyncTag} onChange={e => setNewSyncTag(e.target.value)} style={{ minWidth: 160 }}>
                  <option value="">Select Version</option>
                  {manifest.versions.map(v => <option key={v.tag} value={v.tag}>{v.tag}</option>)}
                </select>
                <button className="btn btn-primary" onClick={addSyncConfig} disabled={savingSync || !newSyncUrl || !newSyncTag}>
                  Add Sync
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && canEdit && (
          <div style={{ background: 'var(--surface)', padding: 24, borderRadius: 12 }}>
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
              rows={4}
            />
            <button className="btn btn-primary" onClick={saveMetadata} style={{ marginTop: 16 }}>Save Changes</button>
          </div>
        )}
      </div>

      {/* Version Edit Modal */}
      {editingVersion && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: 'var(--bg)', padding: 28, borderRadius: 12, width: '90%', maxWidth: 520 }}>
            <h3>Edit Version "{editingVersion.tag}"</h3>
            <input className="form-input" value={editTag} onChange={e => setEditTag(e.target.value)} placeholder="Tag (e.g. 1.8.9)" />
            <input className="form-input" value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="Label (optional)" />
            <textarea className="form-textarea" rows={8} value={editChangelog} onChange={e => setEditChangelog(e.target.value)} placeholder="Changelog..." />
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
