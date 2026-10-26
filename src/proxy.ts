import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/server/db'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()
  if (!request.nextUrl.pathname.startsWith('/embed/')) {
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('Referrer-Policy', 'no-referrer')
    response.headers.set('X-Robots-Tag', 'noindex')
    response.headers.set(
      'Content-Security-Policy',
      "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
    )
    return response
  }
  const slug = request.nextUrl.pathname.split('/')[2]
  let ancestors = "'none'"
  try {
    const result = await db().query<{ allowed_origins: string[] }>(
      'SELECT allowed_origins FROM questionnaires WHERE slug=$1 AND NOT archived',
      [slug],
    )
    const origins = (result.rows[0]?.allowed_origins || []).filter(
      (origin) =>
        /^https:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/.test(origin) ||
        (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost(?::\d+)?$/.test(origin)),
    )
    if (origins.length) ancestors = origins.join(' ')
  } catch {
    /* Fail closed if configuration is unavailable. */
  }
  response.headers.set(
    'Content-Security-Policy',
    `frame-ancestors ${ancestors}; object-src 'none'; base-uri 'self'`,
  )
  response.headers.set('Cache-Control', 'no-store')
  return response
}
export const config = { matcher: ['/embed/:path*', '/confirmation/:path*', '/api/reports/:path*'] }
