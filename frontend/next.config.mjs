// The browser only ever talks to this app's own origin (/api/...). Next.js forwards those calls to the
// backend server-side, so the auth cookie is first-party, which avoids third-party-cookie blocking and
// keeps CSRF protection simple. BACKEND_URL is read at BUILD time and is never exposed to the browser.
const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

if (process.env.VERCEL && !process.env.BACKEND_URL) {
  throw new Error('BACKEND_URL is not set. Add it in Vercel > Project > Settings > Environment Variables, then redeploy.');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Docker builds set NEXT_OUTPUT=standalone to get a small self-contained server.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backendUrl}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
