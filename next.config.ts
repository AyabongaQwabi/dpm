import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
]

const nextConfig: NextConfig = {
  // @sparticuz/chromium ships a compressed Chromium binary that must be
  // bundled as-is (not processed by webpack/turbopack) for the print-kit
  // PDF routes to launch it inside a Vercel serverless function.
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  experimental: {
    serverActions: {
      // Matches the 10MB cap enforced in lib/actions/upload.ts — the
      // Next.js default of 1MB was silently truncating larger image/gallery
      // uploads mid-request (they'd stall around 80% and 500).
      bodySizeLimit: '12mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
