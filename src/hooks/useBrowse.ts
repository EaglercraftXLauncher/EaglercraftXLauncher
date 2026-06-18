import { useEffect, useState } from 'react';
import type { ContentEntry, ContentKind } from '../types';
import { api } from '../lib/api';

type BrowseResult = { items: ContentEntry[]; total: number };

export const useBrowse = (kind: ContentKind, search: string = '') => {
  const [data, setData] = useState<BrowseResult | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await api.browse(kind, { q: search || undefined });
        if (!cancelled) {
          setData({ items: result.items as ContentEntry[], total: result.total });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load content'));
          setData(undefined);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [kind, search]);

  return { data, isLoading, error };
};
