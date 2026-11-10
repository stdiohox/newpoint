/**
 * The CRM's Supabase session cookies. Its own module because middleware.ts
 * imports it and must not pull in next/headers.
 *
 * - path /crm: never sent with public pages;
 * - httpOnly: nothing in the browser reads them (the CRM uses the server
 *   client only), so script on the origin cannot lift the session;
 * - 7 days rather than @supabase/ssr's 400-day default.
 */
export const CRM_COOKIE_OPTIONS = {
  path: '/crm',
  sameSite: 'lax' as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
};

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/**
 * @supabase/ssr 0.12 overwrites any maxAge in cookieOptions with its 400-day
 * default when it sets a cookie, so the lifetime is applied here, where the
 * cookie is actually written. A deletion (maxAge 0) is left alone.
 */
export function withSessionMaxAge<T extends { maxAge?: number }>(options: T): T {
  return options.maxAge === 0 ? options : { ...options, maxAge: SESSION_MAX_AGE };
}
