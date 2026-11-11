'use client';

import Link from 'next/link';
import { CRM_BUTTON } from '@/lib/crm/classes';

/**
 * The error boundary for /crm. A failed read (Supabase down, a bad deploy)
 * lands here instead of Next's bare default page, inside the CRM's ground, with
 * a way back. Error text is never shown: it can quote row values.
 */
export default function CrmError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div id="main" tabIndex={-1} className="outline-hidden">
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-np-ink text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="text-np-neutral-700 mt-3 text-sm">
          The CRM couldn’t load this page. Nothing was changed. Try again, and if it keeps happening, tell Koret.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={reset} className={CRM_BUTTON}>
            Try again
          </button>
          <Link href="/crm" className="text-np-ink inline-flex items-center px-4 py-2 text-sm underline underline-offset-4 hover:no-underline">
            All leads
          </Link>
        </div>
      </div>
    </div>
  );
}
