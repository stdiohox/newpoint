import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { CRM_CARD } from '@/components/crm/CrmChrome';
import { LoginForm } from '@/components/crm/forms';
import { signOut } from '@/app/crm/actions';
import { crmAuthEnv, crmSupabase } from '@/lib/crm/supabase';

export const metadata: Metadata = { title: 'Sign in' };

const ERRORS: Record<string, string> = {
  access: 'This account doesn’t have access to the CRM. Ask the practice to add you, or sign out and use another account.',
  config: 'The CRM isn’t configured on this deployment yet.',
};

export default async function CrmLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const raw = (await searchParams).error;
  const error = Array.isArray(raw) ? raw[0] : raw;
  let signedIn = false;

  if (crmAuthEnv()) {
    const supabase = await crmSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
    // Already signed in with access: straight to the leads. A user WITHOUT access
    // stays here (error=access), or /crm and this page would redirect in a loop.
    if (user && error !== 'access') redirect('/crm');
  }

  const message = error && Object.hasOwn(ERRORS, error) ? ERRORS[error] : undefined;

  return (
    <div id="main" tabIndex={-1} className="outline-hidden">
    <Container className="flex min-h-dvh items-center justify-center py-16">
      <div className={`${CRM_CARD} w-full max-w-sm p-8`}>
        <p className="font-display text-np-ink text-lg font-semibold tracking-tight">
          Newpoint <span className="text-np-neutral-600 font-normal">CRM</span>
        </p>
        <h1 className="text-np-ink mt-6 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-np-neutral-600 mt-2 text-sm">For Newpoint staff only.</p>
        {message && (
          <p role="alert" className="bg-np-neutral-100 text-np-neutral-900 mt-6 rounded-md p-3 text-sm">
            {message}
          </p>
        )}
        <div className="mt-6">
          {signedIn ? (
            <form action={signOut}>
              <button type="submit" className="text-np-ink text-sm underline underline-offset-4">
                Sign out
              </button>
            </form>
          ) : (
            <LoginForm />
          )}
        </div>
      </div>
    </Container>
    </div>
  );
}
