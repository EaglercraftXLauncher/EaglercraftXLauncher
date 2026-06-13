import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import UploadModal from '../components/UploadModal';
import type { ContentEntry, ContentType, ContentCategory } from '../types';

interface BrowserPageProps { type: ContentType }

const API = '/api';
const PAGE_SIZE = 24;
const CAN_UPLOAD = new Set(['developer', 'admin', 'owner']);

const CATEGORIES: { id: ContentCategory | 'all'; label: string }[] = [
  { id: 'all',     label: 'All' },
  { id: 'default', label: 'Official' },
  { id: 'user',    label: 'Community' },
];

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
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

export default function BrowserPage({ type }: BrowserPageProps) {
  const [items,       setItems]       = useState<ContentEntry[]>([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [category,    setCategory]    = useState<ContentCategory | 'all'>('all');
  const [search,      setSearch]      = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showUpload,  setShowUpload]  = useState(false);
  const { user, token } = useAuth();
  const { addToast }    = useToast();

  const title    = type === 'client' ? 'Clients' : type === 'mod' ? 'Mods' : 'Skins';
  const canUpload = user && CAN_UPLOAD.has(user.role);
  const canDelete = user && (user.role === 'admin' || user.role === 'owner');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
      if (category !== 'all') params.set('category', category);
      if (search) params.set('q', search);
      const endpoint = type === 'client' ? 'clients' : type === 'mod' ? 'mods' : 'skins';
      const res  = await fetch(`${API}/${endpoint}?${params}`);
      if (res.ok) {
        const json = await res.json() as { data?: { items: ContentEntry[]; total: number } } & { items: ContentEntry[]; total: number };
        const data = json.data ?? json;
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      } else { addToast('Failed to load content', 'error'); }
    } catch { addToast('Network error', 'error'); }
    finally { setLoading(false); }
  }, [type, category, search, page]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this entry?')) return;
    const endpoint = type === 'client' ? 'clients' : type === 'mod' ? 'mods' : 'skins';
    const res = await fetch(`${API}/${endpoint}/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json() as { ok: boolean; error?: string };
    if (json.ok) { addToast('Deleted', 'success'); fetchItems(); }
    else          { addToast(json.error ?? 'Delete failed', 'error'); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="browser-page">
      {/* Topbar */}
      <div className="topbar">
        <h1 className="topbar-title">{title}</h1>
        {canUpload && (
          <button className="btn btn-primary btn-sm"
            onClick={() => setShowUpload(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <UploadIcon /> Upload {title.slice(0, -1)}
          </button>
        )}
        <form className="topbar-search" onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1); }}
          style={{ marginLeft: canUpload ? 0 : 'auto' }}>
          <SearchIcon />
          <input type="text" placeholder={`Search ${title.toLowerCase()}…`}
            value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </form>
      </div>

      <div className="page-content">
        <div className="cat-tabs">
          {CATEGORIES.map(c => (
            <button key={c.id}
              className={`cat-tab${category === c.id ? ' active' : ''}`}
              onClick={() => { setCategory(c.id); setPage(1); }}>
              {c.label}
            </button>
          ))}
          {total > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
              {total} results
            </span>
          )}
        </div>

        {loading ? (
          <div className="cards-grid">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 220 }} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="empty"><div style={{ fontSize: 40 }}>🔍</div><h3>Nothing found</h3><p>Try a different search or category</p></div>
        ) : (
          <div className="cards-grid">
            {items.map(item => (
              <div key={item.id} className="content-card">
                <div className="content-card-img">
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.title} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    : <span>{item.title[0]?.toUpperCase()}</span>}
                  <span className={`cat-badge ${item.category}`}>
                    {item.category === 'default' ? 'official' : item.category}
                  </span>
                </div>
                <div className="content-card-body">
                  <div className="content-card-title">{item.title}</div>
                  <div className="content-card-desc">{item.description}</div>
                  {item.tags?.length > 0 && (
                    <div className="content-card-tags">
                      {item.tags.slice(0, 4).map(tag => <span key={tag} className="tag">{tag}</span>)}
                    </div>
                  )}
                </div>
                <div className="content-card-footer">
                  <div className="content-card-uploader">
                    <div className="content-card-avatar" />
                    <span>{item.uploaderName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {!item.approved && <span className="pending-badge">pending</span>}
                    {canDelete && (
                      <button onClick={() => handleDelete(item.id)}
                        title="Delete"
                        style={{ background: 'var(--red-dim)', border: 'none', borderRadius: 5,
                          padding: '3px 7px', cursor: 'pointer', color: 'var(--red)',
                          display: 'flex', alignItems: 'center' }}>
                        <TrashIcon />
                      </button>
                    )}
                  </div>
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
        <UploadModal type={type} onClose={() => setShowUpload(false)} onUploaded={fetchItems} />
      )}
    </div>
  );
}
