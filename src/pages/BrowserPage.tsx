import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../hooks/useToast';
import type { ContentEntry, ContentType, ContentCategory } from '../types';

interface BrowserPageProps {
  type: ContentType;
}

const API = '/api';
const PAGE_SIZE = 24;

const CATEGORIES: { id: ContentCategory | 'all'; label: string }[] = [
  { id: 'all',     label: 'All' },
  { id: 'default', label: 'Official' },
  { id: 'user',    label: 'Community' },
];

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

export default function BrowserPage({ type }: BrowserPageProps) {
  const [items, setItems]         = useState<ContentEntry[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [category, setCategory]   = useState<ContentCategory | 'all'>('all');
  const [search, setSearch]       = useState('');
  const [searchInput, setSearchInput] = useState('');
  const { addToast } = useToast();

  const title = type === 'client' ? 'Clients' : type === 'mod' ? 'Mods' : 'Skins';

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit:  String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      });
      if (category !== 'all') params.set('category', category);
      if (search) params.set('q', search);

      const endpoint = type === 'client' ? 'clients' : type === 'mod' ? 'mods' : 'skins';
      const res = await fetch(`${API}/${endpoint}?${params}`);
      if (res.ok) {
        const json = await res.json() as { data?: { items: ContentEntry[]; total: number } } & { items: ContentEntry[]; total: number };
        const data = json.data ?? json;
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      } else {
        addToast('Failed to load content', 'error');
      }
    } catch {
      addToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  }, [type, category, search, page]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="browser-page">
      {/* Topbar */}
      <div className="topbar">
        <h1 className="topbar-title">{title}</h1>
        <form className="topbar-search" onSubmit={handleSearch}>
          <SearchIcon />
          <input
            type="text"
            placeholder={`Search ${title.toLowerCase()}…`}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </form>
      </div>

      {/* Content */}
      <div className="page-content">
        {/* Category tabs */}
        <div className="cat-tabs">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              className={`cat-tab${category === c.id ? ' active' : ''}`}
              onClick={() => { setCategory(c.id); setPage(1); }}
            >
              {c.label}
            </button>
          ))}
          {total > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
              {total} results
            </span>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="cards-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 220 }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="empty">
            <div style={{ fontSize: 40 }}>🔍</div>
            <h3>Nothing found</h3>
            <p>Try a different search or category</p>
          </div>
        ) : (
          <div className="cards-grid">
            {items.map(item => (
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
            <span className="page-info">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────
function ContentCard({ item }: { item: ContentEntry }) {
  const initial = item.title?.[0]?.toUpperCase() ?? '?';
  return (
    <div className="content-card">
      <div className="content-card-img">
        {item.imageUrl
          ? <img src={item.imageUrl} alt={item.title} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          : <span>{initial}</span>
        }
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
        {!item.approved && <span className="pending-badge">pending</span>}
      </div>
    </div>
  );
}
