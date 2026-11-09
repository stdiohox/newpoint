import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CRM_COOKIE_OPTIONS } from './cookies';

/**
 * Server-only Supabase access for /crm (docs/lead-crm.md).
 *
 * Every query runs as the signed-in staff member through Supabase's Data API,
 * so the database's row-level security decides what they see (crm.is_staff()).
 * There is no service key anywhere in the site.
 *
 * Env (Vercel, server-side):
 *   CRM_SUPABASE_URL              https://<ref>.supabase.co
 *   CRM_SUPABASE_PUBLISHABLE_KEY  the project's publishable (anon) key
 */
export function crmAuthEnv(): { url: string; key: string } | null {
  const url = process.env.CRM_SUPABASE_URL;
  const key = process.env.CRM_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

export async function crmSupabase() {
  const env = crmAuthEnv();
  if (!env) throw new Error('CRM is not configured');
  const store = await cookies();
  return createServerClient(env.url, env.key, {
    db: { schema: 'crm' },
    cookieOptions: CRM_COOKIE_OPTIONS,
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Components cannot set cookies; the middleware refreshes them.
        }
      },
    },
  });
}

export interface StaffMember {
  user_id: string;
  email: string;
  display_name: string;
  active: boolean;
  must_change_password: boolean;
}

/**
 * The signed-in staff member, or a redirect. A signed-in user with no active
 * crm.staff row is sent to the login page with an explanation.
 */
export async function requireStaff(options: { allowPasswordChange?: boolean } = {}) {
  if (!crmAuthEnv()) redirect('/crm/login?error=config');
  const supabase = await crmSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/crm/login');

  const { data: staff } = await supabase
    .from('staff')
    .select('user_id, email, display_name, active, must_change_password')
    .eq('user_id', user.id)
    .maybeSingle<StaffMember>();
  if (!staff || !staff.active) redirect('/crm/login?error=access');
  if (staff.must_change_password && !options.allowPasswordChange) redirect('/crm/account?first=1');

  return { supabase, user, staff };
}
