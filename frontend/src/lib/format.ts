const countFormatter = new Intl.NumberFormat('en-IN');

export const formatViews = (views: number) => countFormatter.format(views);

export function formatViewsCompact(views: number): string {
  if (views >= 1_00_00_000) return `${trim(views / 1_00_00_000)}Cr`;
  if (views >= 1_00_000) return `${trim(views / 1_00_000)}L`;
  if (views >= 1_000) return `${trim(views / 1_000)}K`;
  return String(views);
}

const trim = (value: number) => value.toFixed(1).replace(/\.0$/, '');

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const platformLabel = (platform: 'instagram' | 'youtube') => (platform === 'instagram' ? 'Instagram' : 'YouTube');

export function percent(value: number): string {
  return `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
}
