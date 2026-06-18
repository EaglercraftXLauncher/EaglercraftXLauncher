import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const API = '/api';

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

export default function Topbar() {
  const { user, token, refresh } = useAuth();
  const { addToast } = useToast();
  const [query, setQuery] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = query.trim();
    if (!val) return;

    if (val.startsWith('/owner ')) {
      await claimRole('claim-owner', { password: val.slice(7).trim() }, 'owner');
      setQuery(''); return;
    }
    if (val.startsWith('/admin ')) {
      await claimRole('claim-admin', { code: val.slice(7).trim() }, 'admin');
      setQuery(''); return;
    }
    // regular search — no-op here, search handled per-page
  };

  const claimRole = async (endpoint: string, body: Record<string, string>, roleName: string) => {
    if (!user || !token) { addToast('Sign in first', 'error'); return; }
    try {
      const res  = await fetch(`${API}/roles/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) { await refresh(); addToast(`Role upgraded to ${roleName}!`, 'success'); }
      else          { addToast(json.error ?? 'Failed', 'error'); }
    } catch { addToast('Network error', 'error'); }
  };

  return (
    <div className="topbar">
      <form className="topbar-search" onSubmit={handleSubmit} style={{ marginLeft: 'auto' }}>
        <SearchIcon />
        <input
          type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search or /admin code /owner pass"
          autoComplete="off" spellCheck={false}
        />
      </form>
    </div>
  );
}
