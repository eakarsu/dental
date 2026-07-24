import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This middleware checks authentication via session cookies
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  // This AI endpoint performs its own session check so API clients receive a
  // machine-readable 401 instead of an HTML login redirect.
  const publicPaths = ['/login', '/logout', '/api/auth', '/api/ai/runtime-readiness']
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))

  // Static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check for session token
  const sessionToken =
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value

  const isAuthenticated = !!sessionToken

  // Redirect to login if not authenticated and trying to access protected route
  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect to dashboard if authenticated and trying to access login
  if (isAuthenticated && pathname === '/login') {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

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
