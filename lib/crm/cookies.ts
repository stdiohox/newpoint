/**
 * The CRM's Supabase session cookies are scoped to /crm, so they never ride
 * along on public pages. Its own module because middleware.ts imports it and
 * must not pull in next/headers.
 */
export const CRM_COOKIE_OPTIONS = { path: '/crm', sameSite: 'lax' as const };
