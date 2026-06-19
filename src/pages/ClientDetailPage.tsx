import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import type { ContentKind, ClientManifest, ContentVersion } from '../types';

const API = '/api';
const CAN_UPLOAD = new Set(['developer', 'admin', 'owner']);

// ── Icons ──────────────────────────────────────────────────────
const PlayIcon   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const DlIcon     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const UploadIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const SyncIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const BackIcon   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const EditIcon   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>;

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

  // Version editing
  const [editingVersion, setEditingVersion] = useState<string | null>(null); // tag being edited
  const [editVTag,       setEditVTag]       = useState('');
  const [editVLog,       setEditVLog]       = useState('');
  const [editVSaving,    setEditVSaving]    = useState(false);
  const [deletingVTag,   setDeletingVTag]   = useState<string | null>(null);

  // Screenshot upload
  const [ssFile,      setSsFile]      = useState<File | null>(null);
  const [ssUploading, setSsUploading] = useState(false);

  // Doc
  const [docName,      setDocName]      = useState('');
  const [docContent,   setDocContent]   = useState('');
  const [docUploading, setDocUploading] = useState(false);
  const [viewingDoc,   setViewingDoc]   = useState<string | null>(null);
  const [docText,      setDocText]      = useState('');

  // Sync
  const [syncUrl,    setSyncUrl]    = useState('');
  const [syncTag,    setSyncTag]    = useState('');
  const [syncing,    setSyncing]    = useState(false);
  const [savingSync, setSavingSync] = useState(false);

  // Settings (project details editing)
  const [settingsName,        setSettingsName]        = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsFaviconUrl,  setSettingsFaviconUrl]  = useState('');
  const [settingsPosterUrl,   setSettingsPosterUrl]   = useState('');
  const [settingsBannerUrl,   setSettingsBannerUrl]   = useState('');
  const [settingsTags,        setSettingsTags]        = useState('');
  const [settingsSaving,      setSettingsSaving]      = useState(false);

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
        const m = json.data;
        setManifest(m);
        const latest = m.versions.find(v => v.isLatest) ?? m.versions[0] ?? null;
        setActiveVersion(latest);
        if (m.autoSync) { setSyncUrl(m.autoSync.sourceUrl); setSyncTag(m.autoSync.versionTag); }
        // Populate settings fields with current values
        setSettingsName(m.name);
        setSettingsDescription(m.description);
        setSettingsFaviconUrl(m.faviconUrl ?? '');
        setSettingsPosterUrl(m.posterUrl ?? '');
        setSettingsBannerUrl(m.bannerUrl ?? '');
        setSettingsTags((m.tags ?? []).join(', '));
      } else { addToast('Content not found', 'error'); navigate(-1); }
    } catch { addToast('Network error', 'error'); }
    finally { setLoading(false); }
  }, [contentId, endpoint]);

  useEffect(() => { loadManifest(); }, [loadManifest]);

  // ── Version upload ─────────────────────────────────────────
  const uploadVersion = async () => {
    if (!vFile || !vTag.trim()) { addToast('File and version tag required', 'error'); return; }
    setVUploading(true);
    const fd = new FormData();
    fd.append('file', vFile); fd.append('versionTag', vTag.trim()); fd.append('changelog', vLog);
    try {
      const res  = await fetch(`${API}/${endpoint}/${contentId}/versions`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) { addToast('Version uploaded!', 'success'); setVFile(null); setVTag(''); setVLog(''); loadManifest(); }
      else addToast(json.error ?? 'Upload failed', 'error');
    } catch { addToast('Network error', 'error'); }
    finally { setVUploading(false); }
  };

  // ── Version edit (patch changelog/label only — no file replacement) ──
  const startEditVersion = (v: ContentVersion) => {
    setEditingVersion(v.tag);
    setEditVTag(v.tag);
    setEditVLog(v.changelog ?? '');
  };

  const saveEditVersion = async () => {
    if (!editingVersion) return;
    setEditVSaving(true);
    try {
      const res  = await fetch(`${API}/${endpoint}/${contentId}/versions/${encodeURIComponent(editingVersion)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label: editVTag.trim(), changelog: editVLog }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) { addToast('Version updated', 'success'); setEditingVersion(null); loadManifest(); }
      else addToast(json.error ?? 'Failed', 'error');
    } catch { addToast('Network error', 'error'); }
    finally { setEditVSaving(false); }
  };

  // ── Version delete ─────────────────────────────────────────
  const deleteVersion = async (tag: string) => {
    if (!confirm(`Delete version "${tag}"? This cannot be undone.`)) return;
    setDeletingVTag(tag);
    try {
      const res  = await fetch(`${API}/${endpoint}/${contentId}/versions/${encodeURIComponent(tag)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) { addToast(`Version ${tag} deleted`, 'success'); loadManifest(); }
      else addToast(json.error ?? 'Delete failed', 'error');
    } catch { addToast('Network error', 'error'); }
    finally { setDeletingVTag(null); }
  };

  // ── Screenshot upload ──────────────────────────────────────
  const uploadScreenshot = async () => {
    if (!ssFile) { addToast('Select a file', 'error'); return; }
    setSsUploading(true);
    const fd = new FormData(); fd.append('file', ssFile);
    try {
      const res  = await fetch(`${API}/${endpoint}/${contentId}/screenshots`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) { addToast('Screenshot added!', 'success'); setSsFile(null); loadManifest(); }
      else addToast(json.error ?? 'Upload failed', 'error');
    } catch { addToast('Network error', 'error'); }
    finally { setSsUploading(false); }
  };

  // ── Doc upload ─────────────────────────────────────────────
  const uploadDoc = async () => {
    if (!docName.trim() || !docContent.trim()) { addToast('Name and content required', 'error'); return; }
    setDocUploading(true);
    try {
      const res  = await fetch(`${API}/${endpoint}/${contentId}/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: docName.trim(), content: docContent }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) { addToast('Doc saved!', 'success'); setDocName(''); setDocContent(''); loadManifest(); }
      else addToast(json.error ?? 'Failed', 'error');
    } catch { addToast('Network error', 'error'); }
    finally { setDocUploading(false); }
  };

  const viewDoc = async (filename: string) => {
    setViewingDoc(filename); setDocText('Loading…');
    try {
      const res = await fetch(assetUrl(filename));
      setDocText(await res.text());
    } catch { setDocText('Failed to load.'); }
  };

  // ── Auto-sync ──────────────────────────────────────────────
  const saveSync = async (disable = false) => {
    setSavingSync(true);
    const body = disable
      ? { disable: true }
      : { sourceUrl: syncUrl.trim(), versionTag: syncTag.trim(), enabled: true };
    try {
      const res  = await fetch(`${API}/${endpoint}/${contentId}/sync`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) { addToast(disable ? 'Auto-sync disabled' : 'Saved!', 'success'); loadManifest(); }
      else addToast(json.error ?? 'Failed', 'error');
    } catch { addToast('Network error', 'error'); }
    finally { setSavingSync(false); }
  };

  const triggerSync = async () => {
    setSyncing(true);
    try {
      const res  = await fetch(`${API}/${endpoint}/${contentId}/sync`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { ok: boolean; data?: { ok: boolean; msg: string } };
      const d    = json.data;
      if (d?.ok) { addToast(`Synced: ${d.msg}`, 'success'); loadManifest(); }
      else        { addToast(`Sync failed: ${d?.msg ?? 'unknown'}`, 'error'); }
    } catch { addToast('Network error', 'error'); }
    finally { setSyncing(false); }
  };

  // ── Save project settings ──────────────────────────────────
  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res  = await fetch(`${API}/${endpoint}/${contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name:        settingsName.trim(),
          description: settingsDescription.trim(),
          faviconUrl:  settingsFaviconUrl.trim(),
          posterUrl:   settingsPosterUrl.trim(),
          bannerUrl:   settingsBannerUrl.trim(),
          tags:        settingsTags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) { addToast('Settings saved!', 'success'); loadManifest(); }
      else addToast(json.error ?? 'Failed to save', 'error');
    } catch { addToast('Network error', 'error'); }
    finally { setSettingsSaving(false); }
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--text3)' }}>Loading…</div>;
  if (!manifest) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'view',        label: isSkin ? 'Preview' : 'Play' },
    { id: 'versions',    label: `Versions (${manifest.versions.length})` },
    { id: 'screenshots', label: `Screenshots (${manifest.screenshots.length})` },
    { id: 'docs',        label: `Docs (${manifest.docs.length})` },
    ...(canEdit && !isSkin ? [{ id: 'sync' as Tab, label: 'Auto-Sync' }] : []),
    ...(canEdit ? [{ id: 'settings' as Tab, label: '⚙ Settings' }] : []),
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      {manifest.bannerUrl && (
        <div style={{ width: '100%', height: 200, overflow: 'hidden', position: 'relative' }}>
          <img src={manifest.bannerUrl} alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, transparent 40%, var(--bg))' }} />
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>
        <button className="btn btn-ghost btn-sm"
          onClick={() => navigate(`/${endpoint}`)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 20, marginBottom: 16 }}>
          <BackIcon /> Back to {endpoint}
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
          {manifest.faviconUrl && (
            <img src={manifest.faviconUrl} alt=""
              style={{ width: 56, height: 56, borderRadius: 12,
                border: '1px solid var(--border2)', flexShrink: 0, objectFit: 'cover' }} />
          )}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
              {manifest.name}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
              by{' '}
              <Link to={`/profile/${manifest.uploaderUid}`} style={{ color: 'var(--accent)' }}>
                {manifest.author}
              </Link>
              &nbsp;·&nbsp;
              <span style={{ color: 'var(--text3)' }}>
                Updated {new Date(manifest.updatedAt).toLocaleDateString()}
              </span>
            </p>
            {manifest.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {manifest.tags.map(t => <span key={t} className="tag">{t}</span>)}
              </div>
            )}
          </div>

          {activeVersion && (
            isSkin ? (
              <a href={assetUrl(activeVersion.filename)} download
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                <DlIcon /> Download Skin
              </a>
            ) : (
              <a href={assetUrl(activeVersion.filename)} target="_blank" rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                <PlayIcon /> Play {activeVersion.tag}
              </a>
            )
          )}
        </div>

        <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          {manifest.description}
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 28, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer',
              background: tab === t.id ? 'var(--surface2)' : 'transparent',
              color: tab === t.id ? (t.id === 'settings' ? 'var(--orange)' : 'var(--text)') : 'var(--text2)',
              fontWeight: tab === t.id ? 600 : 400,
              fontSize: 13, borderRadius: '6px 6px 0 0', fontFamily: 'var(--font-body)',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── View/Preview tab ── */}
        {tab === 'view' && activeVersion && (
          <div>
            {isSkin ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', padding: 32,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
                }}>
                  <img src={assetUrl(activeVersion.filename)} alt={manifest.name}
                    style={{
                      width: 256, height: 256, imageRendering: 'pixelated', objectFit: 'contain',
                      background: 'repeating-conic-gradient(#1a1f2c 0% 25%, #141820 0% 50%) 0 0 / 16px 16px',
                      borderRadius: 8, border: '1px solid var(--border2)',
                    }} />
                  <p style={{ fontSize: 12, color: 'var(--text3)' }}>64×64 Minecraft skin — pixel-perfect preview</p>
                  <a href={assetUrl(activeVersion.filename)} download={`${manifest.name}.png`}
                    className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <DlIcon /> Download Skin (.png)
                  </a>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      Playing:{' '}
                      <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                        {activeVersion.tag}
                      </span>
                    </span>
                    {manifest.versions.length > 1 && (
                      <select value={activeVersion.tag}
                        onChange={e => setActiveVersion(manifest.versions.find(v => v.tag === e.target.value) ?? null)}
                        className="form-select" style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}>
                        {manifest.versions.map(v => (
                          <option key={v.tag} value={v.tag}>{v.tag}{v.isLatest ? ' (latest)' : ''}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <iframe src={assetUrl(activeVersion.filename)}
                    style={{ width: '100%', aspectRatio: '16/9', border: 'none', display: 'block', background: '#000' }}
                    allow="fullscreen; autoplay; pointer-lock" allowFullScreen />
                </div>
                {activeVersion.changelog && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', padding: '14px 16px' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                      textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Changelog</p>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                      {activeVersion.changelog}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Versions tab ── */}
        {tab === 'versions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isSkin ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 16 }}>
                {manifest.versions.map(v => (
                  <div key={v.tag} style={{
                    background: 'var(--surface)',
                    border: `2px solid ${v.isLatest ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                    cursor: 'pointer', transition: 'border-color 120ms',
                  }} onClick={() => { setActiveVersion(v); setTab('view'); }}>
                    <div style={{
                      background: 'repeating-conic-gradient(#1a1f2c 0% 25%, #141820 0% 50%) 0 0 / 10px 10px',
                      padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '1/1',
                    }}>
                      <img src={assetUrl(v.filename)} alt={v.tag}
                        style={{ width: '80%', height: '80%', objectFit: 'contain', imageRendering: 'pixelated' }} />
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{v.tag}</span>
                        {v.isLatest && (
                          <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                            background: 'var(--accent-dim)', color: 'var(--accent)', textTransform: 'uppercase' }}>latest</span>
                        )}
                      </div>
                      {v.changelog && (
                        <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5,
                          overflow: 'hidden', display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{v.changelog}</p>
                      )}
                      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                        <a href={assetUrl(v.filename)} download={`${manifest.name}-${v.tag}.png`}
                          className="btn btn-ghost btn-sm" onClick={e => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '4px 8px', flex: 1 }}>
                          <DlIcon /> Download
                        </a>
                        {canEdit && (
                          <button className="btn btn-danger btn-sm"
                            onClick={e => { e.stopPropagation(); deleteVersion(v.tag); }}
                            disabled={deletingVTag === v.tag}
                            style={{ padding: '4px 7px', display: 'flex', alignItems: 'center' }}>
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              manifest.versions.map(v => (
                <div key={v.tag} style={{
                  background: 'var(--surface)',
                  border: `1px solid ${v.isLatest ? 'rgba(79,124,255,0.3)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)', padding: '14px 18px',
                }}>
                  {editingVersion === v.tag ? (
                    /* Inline edit form */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <F label="Label / display name">
                        <input className="form-input" value={editVTag} onChange={e => setEditVTag(e.target.value)} />
                      </F>
                      <F label="Changelog">
                        <textarea className="form-textarea" rows={3} value={editVLog}
                          onChange={e => setEditVLog(e.target.value)} />
                      </F>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary btn-sm" onClick={saveEditVersion} disabled={editVSaving}>
                          {editVSaving ? 'Saving…' : 'Save'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingVersion(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700 }}>{v.tag}</span>
                          {v.isLatest && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                              background: 'var(--accent-dim)', color: 'var(--accent)', textTransform: 'uppercase' }}>latest</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                            {new Date(v.uploadedAt).toLocaleDateString()}
                          </span>
                          {canEdit && (
                            <>
                              <button className="btn btn-ghost btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                onClick={() => startEditVersion(v)}>
                                <EditIcon /> Edit
                              </button>
                              <button className="btn btn-danger btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                onClick={() => deleteVersion(v.tag)}
                                disabled={deletingVTag === v.tag}>
                                <TrashIcon />{deletingVTag === v.tag ? '…' : 'Delete'}
                              </button>
                            </>
                          )}
                          <a href={assetUrl(v.filename)} target="_blank" rel="noopener noreferrer"
                            className="btn btn-primary btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <PlayIcon /> Play
                          </a>
                        </div>
                      </div>
                      {v.changelog && (
                        <p style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                          {v.changelog}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))
            )}

            {canEdit && (
              <div style={{ background: 'var(--surface)', border: '1px dashed var(--border2)',
                borderRadius: 'var(--radius-lg)', padding: 20, marginTop: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                  Upload New {isSkin ? 'Skin' : 'Version'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <F label={isSkin ? 'Version tag (e.g. Ocean v2)' : 'Version tag (e.g. v2.0)'}>
                    <input className="form-input" placeholder={isSkin ? 'Ocean v2' : 'v2.0'}
                      value={vTag} onChange={e => setVTag(e.target.value)} />
                  </F>
                  <F label={isSkin ? 'Skin file (.png)' : 'File (.html, .js)'}>
                    <input type="file"
                      accept={isSkin ? '.png,.jpg,.jpeg,.gif,.webp' : '.html,.js'}
                      onChange={e => setVFile(e.target.files?.[0] ?? null)}
                      style={{ color: 'var(--text2)', fontSize: 13 }} />
                  </F>
                  <F label={isSkin ? 'Description (optional)' : 'Changelog'}>
                    <textarea className="form-textarea" rows={2}
                      placeholder={isSkin ? "What's different in this skin…" : 'What changed…'}
                      value={vLog} onChange={e => setVLog(e.target.value)} />
                  </F>
                  <button className="btn btn-primary"
                    style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={uploadVersion} disabled={vUploading}>
                    <UploadIcon />{vUploading ? 'Uploading…' : `Upload ${isSkin ? 'Skin' : 'Version'}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Screenshots tab ── */}
        {tab === 'screenshots' && (
          <div>
            {manifest.screenshots.length === 0 && !canEdit && (
              <div className="empty"><h3>No screenshots yet</h3></div>
            )}
            {manifest.screenshots.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 24 }}>
                {manifest.screenshots.map(s => (
                  <a key={s} href={assetUrl(s)} target="_blank" rel="noopener noreferrer">
                    <img src={assetUrl(s)} alt=""
                      style={{ width: '100%', borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)', display: 'block',
                        aspectRatio: '16/9', objectFit: 'cover' }} />
                  </a>
                ))}
              </div>
            )}
            {canEdit && (
              <div style={{ background: 'var(--surface)', border: '1px dashed var(--border2)',
                borderRadius: 'var(--radius-lg)', padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                  Add {isSkin ? 'Preview Image' : 'Screenshot'}
                </h3>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <input type="file" accept=".png,.jpg,.jpeg,.gif,.webp"
                    onChange={e => setSsFile(e.target.files?.[0] ?? null)}
                    style={{ color: 'var(--text2)', fontSize: 13, flex: 1 }} />
                  <button className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                    onClick={uploadScreenshot} disabled={ssUploading}>
                    <UploadIcon />{ssUploading ? 'Uploading…' : 'Upload'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Docs tab ── */}
        {tab === 'docs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {viewingDoc ? (
              <div>
                <button className="btn btn-ghost btn-sm" onClick={() => setViewingDoc(null)} style={{ marginBottom: 12 }}>
                  ← Back to docs
                </button>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', padding: 20 }}>
                  <pre style={{ fontFamily: 'var(--font-body)', fontSize: 13,
                    color: 'var(--text2)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{docText}</pre>
                </div>
              </div>
            ) : (
              <>
                {manifest.docs.length === 0 && !canEdit && (
                  <div className="empty"><h3>No docs yet</h3></div>
                )}
                {manifest.docs.map(d => (
                  <div key={d} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', padding: '12px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>
                      {d.replace('docs/', '').replace('.md', '')}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={() => viewDoc(d)}>Read</button>
                  </div>
                ))}
                {canEdit && (
                  <div style={{ background: 'var(--surface)', border: '1px dashed var(--border2)',
                    borderRadius: 'var(--radius-lg)', padding: 20, marginTop: 8 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Add Documentation</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <F label="Document name">
                        <input className="form-input" placeholder="getting-started"
                          value={docName} onChange={e => setDocName(e.target.value)} />
                      </F>
                      <F label="Content (Markdown)">
                        <textarea className="form-textarea" rows={8}
                          placeholder="# Getting Started&#10;…"
                          value={docContent} onChange={e => setDocContent(e.target.value)}
                          style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }} />
                      </F>
                      <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}
                        onClick={uploadDoc} disabled={docUploading}>
                        {docUploading ? 'Saving…' : 'Save Doc'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Auto-Sync tab ── */}
        {tab === 'sync' && canEdit && !isSkin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {manifest.autoSync && (
              <div style={{
                background: 'var(--surface)',
                border: `1px solid ${manifest.autoSync.lastSyncOk === false ? 'rgba(240,82,82,0.3)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)', padding: 18,
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Sync Status</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                  <p><span style={{ color: 'var(--text3)' }}>URL: </span>
                    <code style={{ color: 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{manifest.autoSync.sourceUrl}</code></p>
                  <p><span style={{ color: 'var(--text3)' }}>Target: </span>
                    <code style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{manifest.autoSync.versionTag}</code></p>
                  {manifest.autoSync.lastSyncAt && (
                    <p>
                      <span style={{ color: 'var(--text3)' }}>Last sync: </span>
                      <span style={{ color: 'var(--text2)' }}>{new Date(manifest.autoSync.lastSyncAt).toLocaleString()}</span>
                      &nbsp;
                      <span style={{ color: manifest.autoSync.lastSyncOk ? 'var(--green)' : 'var(--red)' }}>
                        {manifest.autoSync.lastSyncOk ? '✓ OK' : '✗ Failed'}
                      </span>
                    </p>
                  )}
                  {manifest.autoSync.lastSyncMsg && (
                    <p style={{ color: 'var(--text3)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{manifest.autoSync.lastSyncMsg}</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={triggerSync} disabled={syncing}>
                    <SyncIcon />{syncing ? 'Syncing…' : 'Sync Now'}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => saveSync(true)} disabled={savingSync}>Disable</button>
                </div>
              </div>
            )}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                {manifest.autoSync ? 'Update' : 'Enable'} Auto-Sync
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
                Provide a public URL to a raw file. When triggered, the worker fetches it and replaces the selected version in GitHub Releases automatically.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <F label="Source URL">
                  <input className="form-input" placeholder="https://example.com/client.html"
                    value={syncUrl} onChange={e => setSyncUrl(e.target.value)} />
                </F>
                <F label="Version to update" hint="Which version tag gets replaced on each sync">
                  <select className="form-select" value={syncTag} onChange={e => setSyncTag(e.target.value)}>
                    <option value="">Select version…</option>
                    {manifest.versions.map(v => <option key={v.tag} value={v.tag}>{v.tag}</option>)}
                  </select>
                </F>
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}
                  onClick={() => saveSync(false)} disabled={savingSync || !syncUrl.trim() || !syncTag}>
                  {savingSync ? 'Saving…' : 'Save Auto-Sync Config'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Settings tab ── */}
        {tab === 'settings' && canEdit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Project details */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: 22 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Project Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <F label="Name">
                  <input className="form-input" value={settingsName}
                    onChange={e => setSettingsName(e.target.value)} maxLength={100} />
                </F>
                <F label="Description">
                  <textarea className="form-textarea" rows={4} value={settingsDescription}
                    onChange={e => setSettingsDescription(e.target.value)} maxLength={1000} />
                </F>
                <F label="Tags" hint="Comma separated">
                  <input className="form-input" placeholder="pvp, 1.8, minigames"
                    value={settingsTags} onChange={e => setSettingsTags(e.target.value)} />
                </F>
              </div>
            </div>

            {/* Images */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: 22 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Images</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <F label="Favicon / Icon URL" hint="Small icon shown in cards and page header">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {settingsFaviconUrl && (
                      <img src={settingsFaviconUrl} alt=""
                        style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border2)', objectFit: 'cover', flexShrink: 0 }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <input className="form-input" placeholder="https://…"
                      value={settingsFaviconUrl} onChange={e => setSettingsFaviconUrl(e.target.value)} />
                  </div>
                </F>
                <F label="Poster / Thumbnail URL" hint="Image shown on the browse page card">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {settingsPosterUrl && (
                      <img src={settingsPosterUrl} alt=""
                        style={{ width: 80, height: 45, borderRadius: 6, border: '1px solid var(--border2)', objectFit: 'cover', flexShrink: 0 }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <input className="form-input" placeholder="https://…"
                      value={settingsPosterUrl} onChange={e => setSettingsPosterUrl(e.target.value)} />
                  </div>
                </F>
                <F label="Banner URL" hint="Wide banner at the top of the detail page">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {settingsBannerUrl && (
                      <img src={settingsBannerUrl} alt=""
                        style={{ width: '100%', height: 80, borderRadius: 8, border: '1px solid var(--border2)', objectFit: 'cover' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <input className="form-input" placeholder="https://…"
                      value={settingsBannerUrl} onChange={e => setSettingsBannerUrl(e.target.value)} />
                  </div>
                </F>
              </div>
            </div>

            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}
              onClick={saveSettings} disabled={settingsSaving}>
              {settingsSaving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)',
        textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: 'var(--text3)' }}>{hint}</p>}
    </div>
  );
}
