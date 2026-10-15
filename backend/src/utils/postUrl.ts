export type SupportedPlatform = 'instagram' | 'youtube';

const INSTAGRAM_HOSTS = new Set(['instagram.com', 'www.instagram.com']);
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
const INSTAGRAM_PATH = /^\/(p|reel|reels|tv)\/[A-Za-z0-9_-]+\/?$/;
const YOUTUBE_SHORTS_PATH = /^\/shorts\/[A-Za-z0-9_-]{6,}\/?$/;
const YOUTUBE_SHORT_LINK_PATH = /^\/[A-Za-z0-9_-]{6,}\/?$/;
const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{6,}$/;

export type PostUrlResult = { ok: true; normalizedUrl: string } | { ok: false; reason: string };

/**
 * Checks that a link points at a real-looking post on the campaign's platform and returns a canonical
 * form (https, no tracking parameters, no trailing slash) so the same post cannot be submitted twice
 * under different spellings. It does not fetch the page or prove the post exists.
 */
export function normalizePostUrl(rawUrl: string, platform: SupportedPlatform): PostUrlResult {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { ok: false, reason: 'Enter a full link starting with https://.' };
  }
  if (url.protocol !== 'https:') return { ok: false, reason: 'The link must start with https://.' };

  const host = url.hostname.toLowerCase();
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (platform === 'instagram') {
    if (!INSTAGRAM_HOSTS.has(host) || !INSTAGRAM_PATH.test(`${path}/`)) {
      return { ok: false, reason: 'Use an Instagram post or reel link, e.g. https://www.instagram.com/reel/abc123/.' };
    }
    return { ok: true, normalizedUrl: `https://www.instagram.com${path}` };
  }

  if (!YOUTUBE_HOSTS.has(host)) {
    return { ok: false, reason: 'Use a YouTube video or Shorts link.' };
  }
  if (host === 'youtu.be') {
    if (!YOUTUBE_SHORT_LINK_PATH.test(path)) return { ok: false, reason: 'Use a YouTube video or Shorts link.' };
    return { ok: true, normalizedUrl: `https://www.youtube.com/watch?v=${path.slice(1)}` };
  }
  if (path === '/watch') {
    const videoId = url.searchParams.get('v') ?? '';
    if (!YOUTUBE_VIDEO_ID.test(videoId)) return { ok: false, reason: 'That YouTube link is missing a video id.' };
    return { ok: true, normalizedUrl: `https://www.youtube.com/watch?v=${videoId}` };
  }
  if (YOUTUBE_SHORTS_PATH.test(path)) {
    return { ok: true, normalizedUrl: `https://www.youtube.com${path}` };
  }
  return { ok: false, reason: 'Use a YouTube video or Shorts link.' };
}
