import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/customer-account/',
          '/provider-dashboard/',
          '/api/',
          '/checkout/',
          '/sign-in',
          '/sign-up',
          '/provider-login',
          '/provider-signup',
        ],
      },
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'Google-Extended', 'PerplexityBot', 'ClaudeBot', 'anthropic-ai'],
        allow: '/',
        disallow: [
          '/customer-account/',
          '/provider-dashboard/',
          '/api/',
          '/checkout/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
