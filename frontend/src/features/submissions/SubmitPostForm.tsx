'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api';
import type { Platform, Submission } from '@/types/api';

const example: Record<Platform, string> = {
  instagram: 'https://www.instagram.com/reel/AbC123xyz/',
  youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
};

export function SubmitPostForm({ campaignId, platform, onSubmitted }: { campaignId: string; platform: Platform; onSubmitted: (submission: Submission) => void }) {
  const toast = useToast();
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    if (!url.trim()) return setError('Paste the link to your post.');
    setBusy(true);
    try {
      const { data } = await api.post<Submission>(`/campaigns/${campaignId}/submissions`, { postUrl: url.trim() });
      toast.push({ tone: 'success', title: 'Post submitted', body: 'Track its views and payouts in Creator Studio.' });
      setUrl('');
      onSubmitted(data);
    } catch (e) {
      setError(e instanceof ApiError ? (e.fieldErrors.postUrl ?? e.message) : 'Could not submit. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <TextField label="Link to your post" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={example[platform]} error={error} />
      <Button type="submit" variant="accent" className="w-full" loading={busy}>
        Submit post
      </Button>
    </form>
  );
}
