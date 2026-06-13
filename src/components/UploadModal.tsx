/**
 * UploadModal.tsx
 * Upload form for clients, mods, and skins.
 * Visible only to developer, admin, owner.
 */
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import type { ContentType } from '../types';

const API = '/api';

interface Props {
  type: ContentType;
  onClose: () => void;
  onUploaded: () => void;
}

const TYPE_LABEL: Record<ContentType, string> = {
  client: 'Client', mod: 'Mod', skin: 'Skin',
};

export default function UploadModal({ type, onClose, onUploaded }: Props) {
  const { token } = useAuth();
  const { addToast } = useToast();

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [url,         setUrl]         = useState('');
  const [imageUrl,    setImageUrl]    = useState('');
  const [tags,        setTags]        = useState('');
  const [loading,     setLoading]     = useState(false);

  const handleSubmit = async () => {
    if (!title.trim())       { addToast('Title is required', 'error'); return; }
    if (!description.trim()) { addToast('Description is required', 'error'); return; }
    if (!url.trim())         { addToast('URL is required', 'error'); return; }

    setLoading(true);
    try {
      const endpoint = type === 'client' ? 'clients' : type === 'mod' ? 'mods' : 'skins';
      const res = await fetch(`${API}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title:       title.trim(),
          description: description.trim(),
          url:         url.trim(),
          imageUrl:    imageUrl.trim() || undefined,
          tags:        tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) {
        addToast(`${TYPE_LABEL[type]} uploaded successfully!`, 'success');
        onUploaded();
        onClose();
      } else {
        addToast(json.error ?? 'Upload failed', 'error');
      }
    } catch { addToast('Network error', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
          Upload {TYPE_LABEL[type]}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Title *">
            <input className="form-input" placeholder={`${TYPE_LABEL[type]} name`}
              value={title} onChange={e => setTitle(e.target.value)} maxLength={120} />
          </Field>
          <Field label="Description *">
            <textarea className="form-textarea" placeholder="Describe this content…"
              value={description} onChange={e => setDescription(e.target.value)}
              maxLength={1000} rows={3} />
          </Field>
          <Field label="URL * (direct link to the file or page)">
            <input className="form-input" placeholder="https://…"
              value={url} onChange={e => setUrl(e.target.value)} />
          </Field>
          <Field label="Image URL (optional thumbnail)">
            <input className="form-input" placeholder="https://…"
              value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
          </Field>
          <Field label="Tags (comma separated, optional)">
            <input className="form-input" placeholder="pvp, 1.8, minigames"
              value={tags} onChange={e => setTags(e.target.value)} />
          </Field>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Uploading…' : `Upload ${TYPE_LABEL[type]}`}
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
