import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import UploadModal from '../components/UploadModal';
import type { ContentKind } from '../types';

interface IndexEntry {
  contentId:   string;
  kind:        ContentKind;
  name:        string;
  author:      string;
  faviconUrl:  string;
  posterUrl:   string;
  description: string;
  uploaderUid: string;
  createdAt:   string;
  latestTag:   string | null;
}

const API = '/api';
const PAGE_SIZE = 24;
const CAN_UPLOAD = new Set(['developer', 'admin', 'owner']);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const UploadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
);

export default function BrowserPage({ kind }: { kind: ContentKind }) {
  const [items,       setItems]       = useState<IndexEntry[]>([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showUpload,  setShowUpload]  = useState(false);
  const { user, token } = useAuth();
  const { addToast }    = useToast();
  const navigate        = useNavigate();

  const title     = kind === 'client' ? 'Clients' : kind === 'mod' ? 'Mods' : 'Skins';
  const endpoint  = kind === 'client' ? 'clients' : kind === 'mod' ? 'mods' : 'skins';
  const canUpload = !!user && CAN_UPLOAD.has(user.role);
  const canDelete = !!user && (user.role === 'admin' || user.role === 'owner');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
      if (search) params.set('q', search);
      const res  = await fetch(`${API}/${endpoint}?${params}`);
      const json = await res.json() as { ok: boolean; data?: { items: IndexEntry[]; total: number } };
      if (json.ok && json.data) { setItems(json.data.items); setTotal(json.data.total); }
      else addToast('Failed to load content', 'error');
    } catch { addToast('Network error', 'error'); }
    finally { setLoading(false); }
  }, [endpoint, search, page]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleDelete = async (contentId: string, name: string) => {
    if (!confirm(`Permanently delete "${name}"? This removes the GitHub release too.`)) return;
    const res  = await fetch(`${API}/${endpoint}/${contentId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json() as { ok: boolean; error?: string };
    if (json.ok) { addToast('Deleted', 'success'); fetchItems(); }
    else          { addToast(json.error ?? 'Delete failed', 'error'); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="browser-page">
      <div className="topbar">
        <h1 className="topbar-title">{title}</h1>
        {canUpload && (
          <button className="btn btn-primary btn-sm"
            onClick={() => setShowUpload(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <UploadIcon /> Publish {title.slice(0, -1)}
          </button>
        )}
        <form className="topbar-search"
          onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1); }}
          style={{ marginLeft: canUpload ? 0 : 'auto' }}>
          <SearchIcon />
          <input type="text" placeholder={`Search ${title.toLowerCase()}…`}
            value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </form>
      </div>

      <div className="page-content">
        {total > 0 && (
          <p style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 18 }}>
            {total} {title.toLowerCase()}
          </p>
        )}

        {loading ? (
          <div className="cards-grid">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 230 }} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="empty">
            <div style={{ fontSize: 40 }}>📦</div>
            <h3>No {title.toLowerCase()} yet</h3>
            <p>{canUpload ? 'Be the first to publish one!' : 'Check back later.'}</p>
          </div>
        ) : (
          <div className="cards-grid">
            {items.map(item => (
              <div key={item.contentId} className="content-card"
                onClick={() => navigate(`/${endpoint}/${item.contentId}`)}
                style={{ cursor: 'pointer' }}>
                <div className="content-card-img">
                  {item.posterUrl
                    ? <img src={item.posterUrl} alt={item.name}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    : <span>{item.name[0]?.toUpperCase()}</span>}
                  {item.faviconUrl && (
                    <img src={item.faviconUrl} alt="" style={{
                      position: 'absolute', bottom: 8, left: 8,
                      width: 24, height: 24, borderRadius: 6,
                      border: '1px solid var(--border2)', background: 'var(--surface)',
                    }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                  {item.latestTag && (
                    <span style={{
                      position: 'absolute', top: 8, right: 8,
                      fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
                      background: 'rgba(0,0,0,0.6)', color: '#fff',
                      padding: '2px 7px', borderRadius: 4,
                    }}>{item.latestTag}</span>
                  )}
                </div>
                <div className="content-card-body">
                  <div className="content-card-title">{item.name}</div>
                  <div className="content-card-desc">{item.description}</div>
                </div>
                <div className="content-card-footer">
                  <div className="content-card-uploader">
                    <div className="content-card-avatar" />
                    <span>{item.author}</span>
                  </div>
                  {canDelete && (
                    <button onClick={e => { e.stopPropagation(); handleDelete(item.contentId, item.name); }}
                      title="Delete"
                      style={{ background: 'var(--red-dim)', border: 'none', borderRadius: 5,
                        padding: '4px 7px', cursor: 'pointer', color: 'var(--red)',
                        display: 'flex', alignItems: 'center' }}>
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
            <span className="page-info">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal kind={kind} onClose={() => setShowUpload(false)} onUploaded={fetchItems} />
      )}
    </div>
  );
}
