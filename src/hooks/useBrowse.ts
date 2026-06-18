import { useQuery } from '@tanstack/react-query';
import { ContentEntry, ContentKind } from '../types';
import { api } from '../lib/api';

export const useBrowse = (kind: ContentKind, search: string = '') => {
  return useQuery({
    queryKey: ['browse', kind, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('q', search);
      
      const res = await api.get(`/content/${kind}`, { params });
      return res.data as { items: ContentEntry[]; total: number };
    },
  });
};
