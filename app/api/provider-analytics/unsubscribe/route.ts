import { NextResponse } from 'next/server'
import { unsubscribeAnalyticsDigest } from '@/lib/actions/provider-analytics-digest'

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  const ok = await unsubscribeAnalyticsDigest(token)

  return new NextResponse(
    `<!doctype html>
    <html>
      <head><title>Analytics digest</title></head>
      <body style="font-family:Arial,sans-serif;line-height:1.6;padding:32px;color:#17231f">
        <h1>${ok ? 'Unsubscribed' : 'Link not found'}</h1>
        <p>${ok ? 'You will no longer receive weekly analytics digests.' : 'This unsubscribe link is invalid or has expired.'}</p>
      </body>
    </html>`,
    {
      status: ok ? 200 : 404,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    },
  )
}
