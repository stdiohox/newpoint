import { NextResponse, type NextRequest } from 'next/server';

/**
 * HOLDING-PAGE MODE.
 *
 * With MAINTENANCE_MODE=true, every page request to the production domain is
 * rewritten to /holding. The URL in the address bar does not change. Any other
 * host — the *.vercel.app aliases and previews, localhost — serves the full
 * site as normal, so the build can still be reviewed while the domain holds.
 *
 * MAINTENANCE_MODE is read when middleware runs, but Vercel binds environment
 * variables to a deployment: changing it in the dashboard takes effect on the
 * next deploy, not on the current one.
 *
 * Holding responses carry X-Robots-Tag: noindex, nofollow, and robots.txt on
 * those hosts disallows everything, so nothing the domain serves while it holds
 * is indexed — /holding's own metadata says the same in the HTML.
 */
const HOLDING_HOSTS = new Set(['newpointnp.com', 'www.newpointnp.com']);
const NOINDEX = 'noindex, nofollow';

export function middleware(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE !== 'true') return NextResponse.next();

  // Lowercased, port and trailing FQDN dot stripped: `newpointnp.com.` is the
  // same host and would otherwise get the full site.
  const host = (request.headers.get('host') ?? '').toLowerCase().split(':')[0].replace(/\.$/, '');
  if (!HOLDING_HOSTS.has(host)) return NextResponse.next();

  if (request.nextUrl.pathname === '/robots.txt') {
    return new NextResponse('User-agent: *\nDisallow: /\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': NOINDEX },
    });
  }

  const response = NextResponse.rewrite(new URL('/holding', request.url));
  response.headers.set('X-Robots-Tag', NOINDEX);
  return response;
}

export const config = {
  matcher: [
    /* robots.txt has an extension, so the second pattern skips it; it is listed
       on its own so the holding hosts can answer it. */
    '/robots.txt',
    /* Everything except: Next's own assets (_next/), API routes (api/), any
       path with a file extension (public/ files, icon.png, sitemap.xml,
       favicon.ico), and /opengraph-image — the one extensionless asset route.
       Rewriting that last one would hand link-preview crawlers an HTML page
       where they expect the card image. */
    '/((?!_next/|api/|opengraph-image|.*\\.[^/]+$).*)',
  ],
};
