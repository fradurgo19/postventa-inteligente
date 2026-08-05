import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/cpp' || pathname.startsWith('/cpp/')) {
    if (!isFeatureEnabled('cppModule')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/cpp', '/cpp/:path*'],
};
