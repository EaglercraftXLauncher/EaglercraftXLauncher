import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import type { ContentKind } from '../types';

const API = '/api';
const CAN_UPLOAD = new Set(['developer', 'admin', 'owner']);

// ── Types ──────────────────────────────────────────────────────
interface ContentVersion {
  tag: string; filename: string; label: string;
  changelog: string; uploadedAt: string; isLatest: boolean;
}
interface AutoSyncConfig {
  enabled: boolean; sourceUrl: string; versionTag: string;
  lastSyncAt: string | null; lastSyncOk: boolean | null; lastSyncMsg: string | null;
}
interface ClientManifest {
  contentId: string; kind: ContentKind; name: string; author: string;
  description: string; faviconUrl: string; posterUrl: string; bannerUrl: string;
  tags: string[]; uploaderUid: string; createdAt: string; updatedAt: string;
  versions: ContentVersion[]; screenshots: string[]; docs: string[];
  autoSync: AutoSyncConfig | null;
}

type Tab = 'play' | 'versions' | 'screenshots' | 'docs' | 'sync';

// ── Icons ──────────────────────────────────────────────────────
const PlayIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const UploadIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const SyncIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const BackIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;

export default function ClientDetailPage() {
  const { kind, contentId } = useParams<{ kind: string; contentId: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { addToast } = useToast();

  const [manifest,     setManifest]     = useState<ClientManifest | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState<Tab>('play');
  const [activeVersion, setActiveVersion] = useState<ContentVersion | null>(null);

  // Version upload state
  const [versionFile, setVersionFile]   = useState<File | null>(null);
  const [versionTag,  setVersionTag]    = useState('');
  const [changelog,   setChangelog]     = useState('');
  const [uploading,   setUploading]     = useState(false);

  // Screenshot upload state
  const [ssFile,      setSsFile]        = useState<File | null>(null);
  const [ssUploading, setSsUploading]   = useState(false);

  // Doc state
  const [docName,     setDocName]       = useState('');
  const [docContent,  setDocContent]    = useState('');
  const [docUploading, setDocUploading] = useState(false);
  const [viewingDoc,  setViewingDoc]    = useState<string | null>(null);
  const [docText,     setDocText]       = useState('');

  // Sync state
  const [syncUrl,     setSyncUrl]       = useState('');
  const [syncTag,     setSyncTag]       = useState('');
  const [syncing,     setSyncing]       = useState(false);
  const [savingSync,  setSavingSync]    = useState(false);

  const canEdit = !!user && CAN_UPLOAD.has(user.role);
  const endpoint = kind === 'client' ? 'clients' : kind === 'mod' ? 'mods' : 'skins';

  const loadManifest = useCallback(async () => {
    if (!contentId) return;
    setLoading(true);
    try {
      const res  = await fetch(`${API}/${endpoint}/${contentId}`);
      const json = await res.json() as { ok: boolean; data?: ClientManifest };
      if (json.ok && json.data) {
        setManifest(json.data);
        const latest = json.data.versions.find(v => v.isLatest) ?? json.data.versions[0];
        setActiveVersion(latest ?? null);
        if (json.data.autoSync) {
          setSyncUrl(json.data.autoSync.sourceUrl);
          setSyncTag(json.data.autoSync.versionTag);
        }
      } else { addToast('Content not found', 'error'); navigate(-1); }
    } catch { addToast('Network error', 'error'); }
    finally { setLoading(false); }
  }, [contentId, endpoint]);

  useEffect(() => { loadManifest(); }, [loadManifest]);

  // ── Version upload ──────────────────────────────────────────
  const handleVersionUpload = async () => {
    if (!versionFile || !versionTag.trim()) { addToast('File and version tag required', 'error'); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', versionFile);
    fd.append('versionTag', versionTag.trim());
    fd.append('changelog', changelog);
    try {
      const res  = await fetch(`${API}/${endpoint}/${contentId}/versions`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) { addToast('Version uploaded!', 'success'); setVersionFile(null); setVersionTag(''); setChangelog(''); loadManifest(); }
      else          { addToast(json.error ?? 'Upload failed', 'error'); }
    } catch { addToast('Network error', 'error'); }
    finally { setUploading(false); }
  };

  // ── Screenshot upload ───────────────────────────────────────
  const handleSsUpload = async () => {
    if (!ssFile) { addToast('Select a file', 'error'); return; }
    setSsUploading(true);
    const fd = new FormData(); fd.append('file', ssFile);
    try {
      const res  = await fetch(`${API}/${endpoint}/${contentId}/screenshots`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) { addToast('Screenshot added!', 'success'); setSsFile(null); loadManifest(); }
      else          { addToast(json.error ?? 'Upload failed', 'error'); }
    } catch { addToast('Network error', 'error'); }
    finally { setSsUploading(false); }
  };

  // ── Doc upload ──────────────────────────────────────────────
  const handleDocUpload = async () => {
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
      else          { addToast(json.error ?? 'Failed', 'error'); }
    } catch { addToast('Network error', 'error'); }
    finally { setDocUploading(false); }
  };

  // ── View doc ────────────────────────────────────────────────
  const viewDoc = async (filename: string) => {
    setViewingDoc(filename);
    setDocText('Loading…');
    try {
      const res = await fetch(`${API}/content/${contentId}/asset?path=${encodeURIComponent(filename)}`);
      setDocText(await res.text());
    } catch { setDocText('Failed to load document.'); }
  };

  // ── Save auto-sync ──────────────────────────────────────────
  const handleSaveSync = async (disable = false) => {
    setSavingSync(true);
    try {
      const body = disable ? { disable: true } : { sourceUrl: syncUrl.trim(), versionTag: syncTag.trim(), enabled: true };
      const res  = await fetch(`${API}/${endpoint}/${contentId}/sync`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) { addToast(disable ? 'Auto-sync disabled' : 'Auto-sync saved!', 'success'); loadManifest(); }
      else          { addToast(json.error ?? 'Failed', 'error'); }
    } catch { addToast('Network error', 'error'); }
    finally { setSavingSync(false); }
  };

  // ── Trigger sync ────────────────────────────────────────────
  const handleTriggerSync = async () => {
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

  // ── Asset URL ───────────────────────────────────────────────
  const assetUrl = (filename: string) =>
    `${API}/content/${contentId}/asset?path=${encodeURIComponent(filename)}`;

  if (loading) return <div style={{ padding: 40, color: 'var(--text3)' }}>Loading…</div>;
  if (!manifest) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'play',        label: 'Play' },
    { id: 'versions',    label: `Versions (${manifest.versions.length})` },
    { id: 'screenshots', label: `Screenshots (${manifest.screenshots.length})` },
    { id: 'docs',        label: `Docs (${manifest.docs.length})` },
    ...(canEdit ? [{ id: 'sync' as Tab, label: 'Auto-Sync' }] : []),
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Banner */}
      {manifest.bannerUrl && (
        <div style={{ width: '100%', height: 200, overflow: 'hidden', position: 'relative' }}>
          <img src={manifest.bannerUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, var(--bg))' }} />
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>
        {/* Back */}
        <button className="btn btn-ghost btn-sm"
          onClick={() => navigate(`/${endpoint}`)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 20, marginBottom: 16 }}>
          <BackIcon /> Back to {endpoint}
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
          {manifest.faviconUrl && (
            <img src={manifest.faviconUrl} alt=""
              style={{ width: 56, height: 56, borderRadius: 12, border: '1px solid var(--border2)', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
              {manifest.name}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
              by <Link to={`/profile/${manifest.uploaderUid}`} style={{ color: 'var(--accent)' }}>{manifest.author}</Link>
              &nbsp;·&nbsp;
              <span style={{ color: 'var(--text3)' }}>Updated {new Date(manifest.updatedAt).toLocaleDateString()}</span>
            </p>
            {manifest.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {manifest.tags.map(t => <span key={t} className="tag">{t}</span>)}
              </div>
            )}
          </div>
          {activeVersion && (
            <a href={assetUrl(activeVersion.filename)} target="_blank" rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
              <PlayIcon /> Play {activeVersion.tag}
            </a>
          )}
        </div>

        <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          {manifest.description}
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: '8px 16px', border: 'none', cursor: 'pointer',
                background: tab === t.id ? 'var(--surface2)' : 'transparent',
                color: tab === t.id ? 'var(--text)' : 'var(--text2)',
                fontWeight: tab === t.id ? 600 : 400, fontSize: 13,
                borderRadius: '6px 6px 0 0', fontFamily: 'var(--font-body)',
              }}>{t.label}</button>
          ))}
        </div>

        {/* ── Play tab ── */}
        {tab === 'play' && activeVersion && (
          <div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  Playing: <span style={{ color: 'var(--accent)' }}>{activeVersion.tag}</span>
                </span>
                <select
                  value={activeVersion.tag}
                  onChange={e => setActiveVersion(manifest.versions.find(v => v.tag === e.target.value) ?? null)}
                  className="form-select"
                  style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}>
                  {manifest.versions.map(v => (
                    <option key={v.tag} value={v.tag}>{v.tag}{v.isLatest ? ' (latest)' : ''}</option>
                  ))}
                </select>
              </div>
              <iframe
                src={assetUrl(activeVersion.filename)}
                style={{ width: '100%', aspectRatio: '16/9', border: 'none', display: 'block', background: '#000' }}
                allow="fullscreen; autoplay; pointer-lock"
                allowFullScreen
              />
            </div>
            {activeVersion.changelog && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Changelog</p>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{activeVersion.changelog}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Versions tab ── */}
        {tab === 'versions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {manifest.versions.map(v => (
              <div key={v.tag} style={{
                background: 'var(--surface)', border: `1px solid ${v.isLatest ? 'rgba(79,124,255,0.3)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)', padding: '14px 18px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700 }}>{v.tag}</span>
                    {v.isLatest && <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--accent-dim)', color: 'var(--accent)', padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase' }}>latest</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(v.uploadedAt).toLocaleDateString()}</span>
                    <a href={assetUrl(v.filename)} target="_blank" rel="noopener noreferrer"
                      className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <PlayIcon /> Play
                    </a>
                  </div>
                </div>
                {v.changelog && <p style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{v.changelog}</p>}
              </div>
            ))}

            {canEdit && (
              <div style={{ background: 'var(--surface)', border: '1px dashed var(--border2)', borderRadius: 'var(--radius-lg)', padding: 20, marginTop: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Upload New Version</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <F label="Version tag (e.g. v2.0)">
                    <input className="form-input" placeholder="v2.0" value={versionTag} onChange={e => setVersionTag(e.target.value)} />
                  </F>
                  <F label="File (.html, .js)">
                    <input type="file" accept=".html,.js,.png,.jpg,.webp,.gif"
                      onChange={e => setVersionFile(e.target.files?.[0] ?? null)}
                      style={{ color: 'var(--text2)', fontSize: 13 }} />
                  </F>
                  <F label="Changelog (optional)">
                    <textarea className="form-textarea" rows={3} placeholder="What changed in this version…"
                      value={changelog} onChange={e => setChangelog(e.target.value)} />
                  </F>
                  <button className="btn btn-primary" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={handleVersionUpload} disabled={uploading}>
                    <UploadIcon />{uploading ? 'Uploading…' : 'Upload Version'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Screenshots tab ── */}
        {tab === 'screenshots' && (
          <div>
            {manifest.screenshots.length === 0 ? (
              <div className="empty"><h3>No screenshots yet</h3></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 24 }}>
                {manifest.screenshots.map(s => (
                  <a key={s} href={assetUrl(s)} target="_blank" rel="noopener noreferrer">
                    <img src={assetUrl(s)} alt="" style={{ width: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'block', aspectRatio: '16/9', objectFit: 'cover' }} />
                  </a>
                ))}
              </div>
            )}
            {canEdit && (
              <div style={{ background: 'var(--surface)', border: '1px dashed var(--border2)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Add Screenshot</h3>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <input type="file" accept=".png,.jpg,.jpeg,.gif,.webp"
                      onChange={e => setSsFile(e.target.files?.[0] ?? null)}
                      style={{ color: 'var(--text2)', fontSize: 13 }} />
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                    onClick={handleSsUpload} disabled={ssUploading}>
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
                <button className="btn btn-ghost btn-sm" onClick={() => setViewingDoc(null)} style={{ marginBottom: 12 }}>← Back to docs</button>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
                  <pre style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text2)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{docText}</pre>
                </div>
              </div>
            ) : (
              <>
                {manifest.docs.length === 0 && !canEdit && <div className="empty"><h3>No docs yet</h3></div>}
                {manifest.docs.map(d => (
                  <div key={d} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>{d.replace('docs/', '')}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => viewDoc(d)}>View</button>
                  </div>
                ))}
                {canEdit && (
                  <div style={{ background: 'var(--surface)', border: '1px dashed var(--border2)', borderRadius: 'var(--radius-lg)', padding: 20, marginTop: 8 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Add Documentation</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <F label="Document name">
                        <input className="form-input" placeholder="getting-started" value={docName} onChange={e => setDocName(e.target.value)} />
                      </F>
                      <F label="Content (Markdown)">
                        <textarea className="form-textarea" rows={8} placeholder="# Getting Started&#10;…"
                          value={docContent} onChange={e => setDocContent(e.target.value)}
                          style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }} />
                      </F>
                      <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}
                        onClick={handleDocUpload} disabled={docUploading}>
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
        {tab === 'sync' && canEdit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Current status */}
            {manifest.autoSync && (
              <div style={{ background: 'var(--surface)', border: `1px solid ${manifest.autoSync.lastSyncOk === false ? 'rgba(240,82,82,0.3)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: 18 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Current Status</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                  <p><span style={{ color: 'var(--text3)' }}>URL:</span> <code style={{ color: 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{manifest.autoSync.sourceUrl}</code></p>
                  <p><span style={{ color: 'var(--text3)' }}>Target version:</span> <code style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{manifest.autoSync.versionTag}</code></p>
                  {manifest.autoSync.lastSyncAt && (
                    <p><span style={{ color: 'var(--text3)' }}>Last sync:</span> <span style={{ color: 'var(--text2)' }}>{new Date(manifest.autoSync.lastSyncAt).toLocaleString()}</span>
                      &nbsp;<span style={{ color: manifest.autoSync.lastSyncOk ? 'var(--green)' : 'var(--red)' }}>
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
                    onClick={handleTriggerSync} disabled={syncing}>
                    <SyncIcon />{syncing ? 'Syncing…' : 'Sync Now'}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleSaveSync(true)} disabled={savingSync}>
                    Disable Auto-Sync
                  </button>
                </div>
              </div>
            )}

            {/* Config form */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
                {manifest.autoSync ? 'Update Auto-Sync' : 'Enable Auto-Sync'}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
                Provide a URL to automatically sync game files. When triggered, the worker fetches the latest file from that URL and replaces the specified version's file in GitHub Releases.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <F label="Source URL (raw file link)">
                  <input className="form-input" placeholder="https://example.com/client.html"
                    value={syncUrl} onChange={e => setSyncUrl(e.target.value)} />
                </F>
                <F label="Version to update" hint="Which version tag gets replaced on each sync">
                  <select className="form-select" value={syncTag} onChange={e => setSyncTag(e.target.value)}>
                    <option value="">Select version…</option>
                    {manifest.versions.map(v => <option key={v.tag} value={v.tag}>{v.tag}</option>)}
                  </select>
                </F>
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => handleSaveSync(false)} disabled={savingSync || !syncUrl.trim() || !syncTag}>
                  {savingSync ? 'Saving…' : 'Save Auto-Sync Config'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: 'var(--text3)' }}>{hint}</p>}
    </div>
  );
}
