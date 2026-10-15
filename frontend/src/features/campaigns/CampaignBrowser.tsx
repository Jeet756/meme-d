'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Skeleton';
import { useApi } from '@/hooks/useApi';
import type { Campaign } from '@/types/api';
import { CampaignCard } from './CampaignCard';

export function CampaignBrowser() {
  const [page, setPage] = useState(1);
  const [platform, setPlatform] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const params = new URLSearchParams({ page: String(page), pageSize: '9' });
  if (platform) params.set('platform', platform);
  if (query) params.set('search', query);
  const { data, meta, error, loading, reload } = useApi<Campaign[]>(`/campaigns?${params}`);

  return (
    <div className="space-y-6">
      <form
        role="search"
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <div className="min-w-56 flex-1">
          <label htmlFor="campaign-search" className="mb-1.5 block text-sm font-medium text-fog-200">Search campaigns</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fog-500" aria-hidden />
            <input id="campaign-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name contains..." className="h-11 w-full rounded-control border border-white/10 bg-ink-900/80 pl-10 pr-3 text-sm text-fog-50 placeholder:text-fog-500 focus-visible:border-violet-400" />
          </div>
        </div>
        <div>
          <label htmlFor="platform-filter" className="mb-1.5 block text-sm font-medium text-fog-200">Platform</label>
          <select id="platform-filter" value={platform} onChange={(e) => { setPlatform(e.target.value); setPage(1); }} className="h-11 rounded-control border border-white/10 bg-ink-900/80 px-3 text-sm text-fog-50 focus-visible:border-violet-400">
            <option value="">All platforms</option>
            <option value="instagram">Instagram</option>
            <option value="youtube">YouTube</option>
          </select>
        </div>
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      {loading ? (
        <div role="status" aria-label="Loading campaigns" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-80" />)}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No live campaigns match" body="Try clearing the search or switching platform. New campaigns appear here as soon as brands launch them." />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} href={`/campaigns/${campaign.id}`} />)}
          </div>
          {meta && meta.totalPages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-center gap-3">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-sm text-fog-300">Page {meta.page} of {meta.totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
