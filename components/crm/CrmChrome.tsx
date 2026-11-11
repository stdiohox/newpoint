import Link from 'next/link';
import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';
import { signOut } from '@/app/crm/actions';
import { STATUS_LABEL, STATUS_TONE, type LeadStatus } from '@/lib/crm/model';
import { cn } from '@/lib/utils';

/**
 * The staff-only frame for /crm. Quiet on purpose: warm off-white ground,
 * hairline borders, one ink accent. The public navbar is hidden on these
 * routes (globals.css, `main[data-crm]`).
 */
export function CrmHeader({ staffName }: { staffName: string }) {
  return (
    <header className="border-np-neutral-200 border-b bg-white">
      <Container className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
        <div className="flex items-center gap-6">
          <Link
            href="/crm"
            className="font-display text-np-ink focus-visible:outline-np-ink rounded-sm text-lg font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Newpoint <span className="text-np-neutral-600 font-normal">CRM</span>
          </Link>
          <nav aria-label="CRM" className="text-small flex gap-4">
            <CrmNavLink href="/crm">Leads</CrmNavLink>
            <CrmNavLink href="/crm/reviews">Reviews</CrmNavLink>
            <CrmNavLink href="/crm/account">Account</CrmNavLink>
          </nav>
        </div>
        <div className="text-small flex items-center gap-4">
          <span className="text-np-neutral-600">{staffName}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="text-np-ink focus-visible:outline-np-ink rounded-sm underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Sign out
            </button>
          </form>
        </div>
      </Container>
    </header>
  );
}

function CrmNavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-np-neutral-700 hover:text-np-ink focus-visible:outline-np-ink rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {children}
    </Link>
  );
}

export function StatusChip({ status, className }: { status: LeadStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide whitespace-nowrap',
        STATUS_TONE[status],
        className
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export { CRM_BUTTON, CRM_CARD, CRM_FIELD, CRM_LABEL } from '@/lib/crm/classes';
