/**
 * UploadModal.tsx
 * Uploads a file (.html/.js for clients & mods, .png/.jpg/.gif/.webp for skins)
 * along with metadata, via multipart/form-data to /api/clients|mods|skins.
 *
 * Visible only to developer, admin, owner.
 */
import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import type { ContentKind } from '../types';

const API = '/api';

interface Props {
  kind: ContentKind;
  onClose: () => void;
  onUploaded: () => void;
}

const KIND_LABEL: Record<ContentKind, string> = {
  client: 'Client', mod: 'Mod', skin: 'Skin',
};

// Accepted file extensions per content kind
const ACCEPT: Record<ContentKind, string> = {
  client: '.html,.js',
  mod:    '.js,.html',
  skin:   '.png,.jpg,.jpeg,.gif,.webp',
};

export default function UploadModal({ kind, onClose, onUploaded }: Props) {
  const { token } = useAuth();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name,        setName]        = useState('');
  const [author,      setAuthor]      = useState('');
  const [description, setDescription] = useState('');
  const [faviconUrl,  setFaviconUrl]  = useState('');
  const [posterUrl,   setPosterUrl]   = useState('');
  const [readme,      setReadme]      = useState('');
  const [file,        setFile]        = useState<File | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [progress,    setProgress]    = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 60 * 1024 * 1024) {
      addToast('File too large — max 60 MB', 'error');
      return;
    }
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleSubmit = async () => {
    if (!file)            { addToast('Please select a file', 'error'); return; }
    if (!name.trim())     { addToast('Name is required', 'error'); return; }
    if (!description.trim()) { addToast('Description is required', 'error'); return; }

    setLoading(true);
    setProgress('Uploading to GitHub CDN…');

    try {
      const endpoint = kind === 'client' ? 'clients' : kind === 'mod' ? 'mods' : 'skins';
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', name.trim());
      fd.append('author', author.trim() || '');
      fd.append('description', description.trim());
      fd.append('faviconUrl', faviconUrl.trim());
      fd.append('posterUrl', posterUrl.trim());
      if (readme.trim()) fd.append('readme', readme.trim());

      const res = await fetch(`${API}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }, // no Content-Type — browser sets multipart boundary
        body: fd,
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) {
        addToast(`${KIND_LABEL[kind]} published!`, 'success');
        onUploaded();
        onClose();
      } else {
        addToast(json.error ?? 'Upload failed', 'error');
      }
    } catch {
      addToast('Network error during upload', 'error');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          Publish {KIND_LABEL[kind]}
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18 }}>
          Your file is stored as a GitHub Release asset and listed in {kind}s.json
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* File picker */}
          <Field label={`File * (${ACCEPT[kind]})`}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '1.5px dashed var(--border2)', borderRadius: 'var(--radius)',
                padding: '20px', textAlign: 'center', cursor: 'pointer',
                background: 'var(--surface2)', transition: 'border-color 120ms',
                color: file ? 'var(--text)' : 'var(--text3)', fontSize: 13,
              }}
            >
              {file ? (
                <>📄 <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)</>
              ) : (
                <>Click to choose a file…</>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept={ACCEPT[kind]}
              onChange={handleFileSelect} style={{ display: 'none' }} />
          </Field>

          <Field label="Name *">
            <input className="form-input" placeholder={`${KIND_LABEL[kind]} name`}
              value={name} onChange={e => setName(e.target.value)} maxLength={100} />
          </Field>
          <Field label="Author">
            <input className="form-input" placeholder="Defaults to your account name"
              value={author} onChange={e => setAuthor(e.target.value)} maxLength={60} />
          </Field>
          <Field label="Description *">
            <textarea className="form-textarea" placeholder="Describe this content…"
              value={description} onChange={e => setDescription(e.target.value)}
              maxLength={500} rows={3} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Favicon URL">
              <input className="form-input" placeholder="https://…"
                value={faviconUrl} onChange={e => setFaviconUrl(e.target.value)} />
            </Field>
            <Field label="Poster / banner URL">
              <input className="form-input" placeholder="https://…"
                value={posterUrl} onChange={e => setPosterUrl(e.target.value)} />
            </Field>
          </div>
          <Field label="README.md (optional — shown on detail page)">
            <textarea className="form-textarea" placeholder="# About this content…"
              value={readme} onChange={e => setReadme(e.target.value)}
              rows={3} style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }} />
          </Field>
        </div>

        {progress && (
          <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 14 }}>{progress}</p>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Publishing…' : `Publish ${KIND_LABEL[kind]}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)',
        textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
      {children}
    </div>
  );
}
