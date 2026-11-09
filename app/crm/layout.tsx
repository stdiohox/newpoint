import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * /crm: the staff-only lead CRM (docs/lead-crm.md). Never indexed (this, plus
 * the X-Robots-Tag the middleware sets), never in the sitemap, and served on
 * the production domain even while it holds (middleware.ts).
 *
 * A direct <main> child of <body> carrying data-crm, which is what hides the
 * public navbar here (globals.css).
 */
export const metadata: Metadata = {
  title: { absolute: 'Newpoint CRM' },
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

export const dynamic = 'force-dynamic';

export default function CrmLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" data-crm className="bg-np-neutral-50 text-np-ink min-h-dvh">
      {children}
    </main>
  );
}
