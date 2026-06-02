import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import type { ContentEntry, ContentType, ContentCategory } from "../types";

interface BrowseState {
  items: ContentEntry[];
  total: number;
  loading: boolean;
  error: string | null;
}

const PAGE_SIZE = 24;

export function useBrowse(
  type: ContentType,
  category: ContentCategory,
  search: string,
  page: number
) {
  const [state, setState] = useState<BrowseState>({
    items: [], total: 0, loading: true, error: null,
  });

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await api.browse(type, {
        category,
        limit:  PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        q:      search || undefined,
      });
      setState({ items: result.items, total: result.total, loading: false, error: null });
    } catch (e) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load",
      }));
    }
  }, [type, category, search, page]);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...state, refetch: fetch, pageSize: PAGE_SIZE };
}
