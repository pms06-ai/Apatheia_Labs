/**
 * APATHEIA LABS - MIDDLEWARE
 * 
 * Handles:
 * - Authentication verification
 * - Rate limiting
 * - Request logging
 * - Security headers
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Rate limiting store (in-memory for development, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Rate limit configuration
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // per window
  apiMaxRequests: 30, // stricter for API routes
}

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/',
  '/api/health',
  '/auth/login',
  '/auth/callback',
]

// Paths that need rate limiting
const RATE_LIMITED_PATHS = [
  '/api/engines',
  '/api/analysis',
  '/api/documents/upload',
  '/api/search',
]

/**
 * Check rate limit for a given key
 */
function checkRateLimit(key: string, maxRequests: number): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetAt) {
    // New window
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT.windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetIn: RATE_LIMIT.windowMs }
  }

  if (record.count >= maxRequests) {
    // Rate limited
    return { allowed: false, remaining: 0, resetIn: record.resetAt - now }
  }

  // Increment
  record.count++
  return { allowed: true, remaining: maxRequests - record.count, resetIn: record.resetAt - now }
}

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  // Try to get real IP from headers (for reverse proxy)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown'

  return ip
}

/**
 * Check if path matches any patterns
 */
function matchesPath(pathname: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    if (pattern.endsWith('*')) {
      return pathname.startsWith(pattern.slice(0, -1))
    }
    return pathname === pattern || pathname.startsWith(pattern + '/')
  })
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const startTime = Date.now()

  // Create response
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // ============================================
  // RATE LIMITING
  // ============================================

  if (matchesPath(pathname, RATE_LIMITED_PATHS)) {
    const clientId = getClientId(request)
    const maxRequests = pathname.startsWith('/api/') ? RATE_LIMIT.apiMaxRequests : RATE_LIMIT.maxRequests
    const rateLimit = checkRateLimit(`${clientId}:${pathname}`, maxRequests)

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', String(maxRequests))
    response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining))
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimit.resetIn / 1000)))

    if (!rateLimit.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: {
            code: 'RATE_LIMITED',
            message: `Rate limit exceeded. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.`,
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetIn / 1000)),
          },
        }
      )
    }
  }

  // ============================================
  // AUTHENTICATION
  // ============================================

  // Skip auth for public paths OR if in mock mode
  const isMock = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')

  if (!matchesPath(pathname, PUBLIC_PATHS) && pathname.startsWith('/api/') && !isMock) {
    // Create Supabase client for auth check
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Check session
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      // For API routes, return 401
      if (pathname.startsWith('/api/')) {
        return new NextResponse(
          JSON.stringify({
            error: {
              code: 'AUTH_REQUIRED',
              message: 'Authentication required',
            },
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // For pages, redirect to login
      const redirectUrl = new URL('/auth/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Add user info to headers for downstream use
    response.headers.set('X-User-Id', session.user.id)
    response.headers.set('X-User-Email', session.user.email || '')
  }

  // ============================================
  // REQUEST LOGGING
  // ============================================

  // Log API requests in development
  if (process.env.NODE_ENV === 'development' && pathname.startsWith('/api/')) {
    const duration = Date.now() - startTime
    console.log(`[Middleware] ${request.method} ${pathname} - ${duration}ms`)
  }

  // ============================================
  // SECURITY HEADERS
  // ============================================

  // Additional security headers (supplement vercel.json)
  response.headers.set('X-Request-Id', crypto.randomUUID())

  return response
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
