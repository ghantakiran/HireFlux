import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth-cookies';

/** Route prefixes that require authentication */
const PROTECTED_PREFIXES = ['/dashboard', '/employer', '/onboarding', '/candidate'];

/** Exact public routes within otherwise protected prefixes */
const PUBLIC_EMPLOYER_ROUTES = ['/employer/login', '/employer/register', '/employer/verify-email'];

/** Auth pages — redirect away if already authenticated */
const AUTH_PAGES = ['/signin', '/signup'];

function isProtectedRoute(pathname: string): boolean {
  // Check if route is explicitly public within a protected prefix
  if (PUBLIC_EMPLOYER_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    return false;
  }
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}

function addSecurityHeaders(response: NextResponse): void {
  // HSTS — enforce HTTPS for 2 years with preload
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // XSS protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), browsing-topics=()'
  );

  // DNS prefetch for performance
  response.headers.set('X-DNS-Prefetch-Control', 'on');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Add security headers to all responses
  addSecurityHeaders(response);

  // Auth check for protected routes
  if (isProtectedRoute(pathname)) {
    const authCookie = request.cookies.get(AUTH_COOKIE_NAME);

    if (!authCookie?.value) {
      // No auth cookie — redirect to sign in with return URL
      const signinUrl = new URL('/signin', request.url);
      signinUrl.searchParams.set('returnUrl', pathname);
      const redirectResponse = NextResponse.redirect(signinUrl);
      addSecurityHeaders(redirectResponse);
      return redirectResponse;
    }
  }

  // Redirect authenticated users away from auth pages
  if (AUTH_PAGES.some((page) => pathname === page)) {
    const authCookie = request.cookies.get(AUTH_COOKIE_NAME);

    if (authCookie?.value) {
      const dashboardUrl = new URL('/dashboard', request.url);
      const redirectResponse = NextResponse.redirect(dashboardUrl);
      addSecurityHeaders(redirectResponse);
      return redirectResponse;
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - Static assets (images, fonts, etc.)
     * - API routes (handled by rewrites in next.config.js)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
};
