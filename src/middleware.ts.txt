
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Add paths that require authentication
const protectedPaths = ['/', '/admin', '/admin/clubs']; // Add other paths as needed
const adminPaths = ['/admin', '/admin/clubs']; // Paths requiring ADMIN role
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const currentUserCookie = request.cookies.get('firebaseAuthToken'); // Example cookie name, adjust if different
  return NextResponse.next();
}
// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (the login page itself to avoid redirect loops)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
};
