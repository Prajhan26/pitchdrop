import { NextRequest, NextResponse } from 'next/server'
import { isBlockedCountry } from './lib/geo'

export function middleware(request: NextRequest) {
  // In development, skip geo-blocking unless explicitly opted in via env var.
  // This lets the team work locally without needing to spoof headers.
  const isProduction = process.env.NODE_ENV === 'production'
  const forceEnabled = process.env.GEO_BLOCK_ENABLED === 'true'

  if (!isProduction && !forceEnabled) {
    return NextResponse.next()
  }

  const country = request.headers.get('cf-ipcountry')

  if (isBlockedCountry(country)) {
    const url = request.nextUrl.clone()
    url.pathname = '/blocked'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  /*
   * Match all routes except:
   *  - /blocked          (avoid redirect loop)
   *  - /_next/static     (static assets)
   *  - /_next/image      (image optimisation)
   *  - /favicon.ico
   */
  matcher: ['/((?!blocked|_next/static|_next/image|favicon\\.ico).*)'],
}
