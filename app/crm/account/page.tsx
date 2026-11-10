import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { CRM_CARD, CrmHeader } from '@/components/crm/CrmChrome';
import { PasswordForm } from '@/components/crm/forms';
import { requireStaff } from '@/lib/crm/supabase';

export const metadata: Metadata = { title: 'Account' };

export default async function CrmAccount({ searchParams }: { searchParams: Promise<{ first?: string }> }) {
  const { staff } = await requireStaff({ allowPasswordChange: true });
  const { first } = await searchParams;
  const mustChange = staff.must_change_password;

  return (
    <>
      <CrmHeader staffName={staff.display_name} />
      <div id="main" tabIndex={-1} className="outline-hidden">
      <Container className="py-10 md:py-14">
        <h1 className="text-np-ink text-3xl font-semibold tracking-tight">Account</h1>
        <p className="text-np-neutral-600 mt-1 text-sm">{staff.email}</p>

        <section aria-labelledby="password-heading" className={`${CRM_CARD} mt-8 max-w-md p-6`}>
          <h2 id="password-heading" className="text-np-ink text-base font-semibold">
            {mustChange ? 'Set your password' : 'Change password'}
          </h2>
          {(mustChange || first) && (
            <p className="text-np-neutral-700 mt-2 text-sm">
              You signed in with a temporary password. Choose your own to finish setting up your account.
            </p>
          )}
          <div className="mt-5">
            <PasswordForm />
          </div>
        </section>
      </Container>
      </div>
    </>
  );
}
