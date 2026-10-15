import { normalizePostUrl } from '../../src/utils/postUrl';

describe('normalizePostUrl', () => {
  it('canonicalises Instagram reels and strips tracking parameters', () => {
    const result = normalizePostUrl('https://instagram.com/reel/Abc_123/?utm_source=ig_web&igsh=xyz', 'instagram');
    expect(result).toEqual({ ok: true, normalizedUrl: 'https://www.instagram.com/reel/Abc_123' });
  });

  it('treats a trailing slash and no trailing slash as the same post', () => {
    const a = normalizePostUrl('https://www.instagram.com/p/Abc123/', 'instagram');
    const b = normalizePostUrl('https://www.instagram.com/p/Abc123', 'instagram');
    expect(a).toEqual(b);
  });

  it('accepts the three common YouTube forms and converges on one canonical link', () => {
    const expected = { ok: true, normalizedUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' };
    expect(normalizePostUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s', 'youtube')).toEqual(expected);
    expect(normalizePostUrl('https://youtu.be/dQw4w9WgXcQ?si=abc', 'youtube')).toEqual(expected);
    expect(normalizePostUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube')).toEqual(expected);
  });

  it('accepts YouTube Shorts', () => {
    expect(normalizePostUrl('https://www.youtube.com/shorts/abcDEF123', 'youtube').ok).toBe(true);
  });

  it('rejects a link from the wrong platform', () => {
    expect(normalizePostUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'instagram').ok).toBe(false);
    expect(normalizePostUrl('https://www.instagram.com/reel/abc123/', 'youtube').ok).toBe(false);
  });

  it('rejects non-https, malformed and look-alike hosts', () => {
    expect(normalizePostUrl('http://www.instagram.com/reel/abc123/', 'instagram').ok).toBe(false);
    expect(normalizePostUrl('not a url', 'instagram').ok).toBe(false);
    expect(normalizePostUrl('https://instagram.com.evil.example/reel/abc123/', 'instagram').ok).toBe(false);
  });

  it('rejects profile pages and YouTube links without a video id', () => {
    expect(normalizePostUrl('https://www.instagram.com/someone/', 'instagram').ok).toBe(false);
    expect(normalizePostUrl('https://www.youtube.com/watch', 'youtube').ok).toBe(false);
    expect(normalizePostUrl('https://www.youtube.com/@channel', 'youtube').ok).toBe(false);
  });
});
