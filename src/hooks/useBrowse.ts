import { useState, useEffect, useCallback } from "react";
import type { ContentEntry, ContentKind } from "../types";

interface BrowseState {
  items: ContentEntry[];
  total: number;
  loading: boolean;
  error: string | null;
}

interface BrowseResult {
  items: ContentEntry[];
  total: number;
  limit: number;
  offset: number;
}

interface ApiResponse {
  ok: boolean;
  data?: BrowseResult;
  items?: ContentEntry[];
  total?: number;
}

const PAGE_SIZE = 24;
const API = '/api';

/**
 * Fetch a page of GitHub-CDN-backed content (clients, mods, skins).
 * No category filter — content is no longer split by category.
 */
export function useBrowse(kind: ContentKind, search: string, page: number) {
  const [state, setState] = useState<BrowseState>({
    items: [], total: 0, loading: true, error: null,
  });

  const load = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const endpoint = kind === 'client' ? 'clients' : kind === 'mod' ? 'mods' : 'skins';
      const sp = new URLSearchParams({
        limit:  String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      });
      if (search) sp.set('q', search);

      const res = await fetch(`${API}/${endpoint}?${sp}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as ApiResponse;
      const data = (json.data ?? json) as unknown as BrowseResult;
      setState({
        items:   (data.items ?? []) as ContentEntry[],
        total:   data.total ?? 0,
        loading: false,
        error:   null,
      });
    } catch (e) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load",
      }));
    }
  }, [kind, search, page]);

  useEffect(() => { load(); }, [load]);

  return { ...state, refetch: load, pageSize: PAGE_SIZE };
}
