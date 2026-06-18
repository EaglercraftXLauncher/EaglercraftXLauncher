import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import type { ContentKind } from '../types';

const API = '/api';
const KIND_LABEL: Record<ContentKind, string> = { client: 'Client', mod: 'Mod', skin: 'Skin' };
const ACCEPT: Record<ContentKind, string> = {
  client: '.html,.js',
  mod:    '.js,.html',
  skin:   '.png,.jpg,.jpeg,.gif,.webp',
};

interface Props { kind: ContentKind; onClose: () => void; onUploaded: () => void; }

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: 'var(--text3)' }}>{hint}</p>}
    </div>
  );
}

export default function UploadModal({ kind, onClose, onUploaded }: Props) {
  const { token } = useAuth();
  const { addToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name,        setName]        = useState('');
  const [author,      setAuthor]      = useState('');
  const [description, setDescription] = useState('');
  const [faviconUrl,  setFaviconUrl]  = useState('');
  const [posterUrl,   setPosterUrl]   = useState('');
  const [bannerUrl,   setBannerUrl]   = useState('');
  const [versionTag,  setVersionTag]  = useState('v1.0');
  const [changelog,   setChangelog]   = useState('');
  const [tags,        setTags]        = useState('');
  const [readme,      setReadme]      = useState('');
  const [file,        setFile]        = useState<File | null>(null);
  const [loading,     setLoading]     = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 60 * 1024 * 1024) { addToast('Max file size is 60 MB', 'error'); return; }
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleSubmit = async () => {
    if (!file)            { addToast('Select a file', 'error'); return; }
    if (!name.trim())     { addToast('Name is required', 'error'); return; }
    if (!description.trim()) { addToast('Description is required', 'error'); return; }
    if (!versionTag.trim())  { addToast('Version tag is required', 'error'); return; }

    setLoading(true);
    const endpoint = kind === 'client' ? 'clients' : kind === 'mod' ? 'mods' : 'skins';
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', name.trim());
    fd.append('author', author.trim());
    fd.append('description', description.trim());
    fd.append('faviconUrl', faviconUrl.trim());
    fd.append('posterUrl', posterUrl.trim());
    fd.append('bannerUrl', bannerUrl.trim());
    fd.append('versionTag', versionTag.trim());
    fd.append('changelog', changelog.trim());
    fd.append('tags', tags);
    if (readme.trim()) fd.append('readme', readme.trim());

    try {
      const res  = await fetch(`${API}/${endpoint}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) { addToast(`${KIND_LABEL[kind]} published!`, 'success'); onUploaded(); onClose(); }
      else          { addToast(json.error ?? 'Upload failed', 'error'); }
    } catch { addToast('Network error', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          Publish {KIND_LABEL[kind]}
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>
          Stored as a GitHub Release in the Eaglercraft X Launcher CDN
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
          <Field label={`File * (${ACCEPT[kind]})`}>
            <div onClick={() => fileRef.current?.click()} style={{
              border: '1.5px dashed var(--border2)', borderRadius: 'var(--radius)',
              padding: 18, textAlign: 'center', cursor: 'pointer',
              background: 'var(--surface2)', color: file ? 'var(--text)' : 'var(--text3)', fontSize: 13,
            }}>
              {file ? <>📄 <strong>{file.name}</strong> ({(file.size/1024).toFixed(1)} KB)</> : 'Click to choose file…'}
            </div>
            <input ref={fileRef} type="file" accept={ACCEPT[kind]} onChange={handleFile} style={{ display: 'none' }} />
          </Field>

          <Field label="Name *">
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} maxLength={100} />
          </Field>
          <Field label="Author" hint="Defaults to your account name">
            <input className="form-input" value={author} onChange={e => setAuthor(e.target.value)} maxLength={60} />
          </Field>
          <Field label="Description *">
            <textarea className="form-textarea" rows={3} value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} />
          </Field>
          <Field label="Version tag *" hint="e.g. v1.0, v2.1-beta">
            <input className="form-input" value={versionTag} onChange={e => setVersionTag(e.target.value)} maxLength={30} />
          </Field>
          <Field label="Changelog">
            <textarea className="form-textarea" rows={2} placeholder="What's in this version…" value={changelog} onChange={e => setChangelog(e.target.value)} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Favicon URL">
              <input className="form-input" placeholder="https://…" value={faviconUrl} onChange={e => setFaviconUrl(e.target.value)} />
            </Field>
            <Field label="Poster URL">
              <input className="form-input" placeholder="https://…" value={posterUrl} onChange={e => setPosterUrl(e.target.value)} />
            </Field>
          </div>
          <Field label="Banner URL" hint="Wide banner shown at top of detail page">
            <input className="form-input" placeholder="https://…" value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} />
          </Field>
          <Field label="Tags" hint="Comma separated">
            <input className="form-input" placeholder="pvp, 1.8, minigames" value={tags} onChange={e => setTags(e.target.value)} />
          </Field>
          <Field label="README.md (optional)">
            <textarea className="form-textarea" rows={3} placeholder="# About…" value={readme} onChange={e => setReadme(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }} />
          </Field>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Publishing…' : `Publish ${KIND_LABEL[kind]}`}
          </button>
        </div>
      </div>
    </div>
  );
}
