import type { Metadata, Viewport } from 'next';
import { cabinetGrotesk, switzer } from './fonts';
import { BUSINESS } from '@/lib/content';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(BUSINESS.domain),
  title: {
    default: 'Psychiatric Nurse Practitioners in NJ and PA | Newpoint',
    template: `%s | ${BUSINESS.shortName}`,
  },
  description:
    'Psychiatric evaluation, medication management, and telehealth for New Jersey and Pennsylvania, from two doctorate-prepared nurse practitioners.',
  applicationName: BUSINESS.legalName,
  authors: [{ name: BUSINESS.legalName }],
  keywords: [
    'psychiatric nurse practitioner',
    'medication management',
    'psychiatric evaluation',
    'telehealth psychiatry',
    'New Jersey',
    'Pennsylvania',
  ],
  openGraph: {
    type: 'website',
    siteName: BUSINESS.legalName,
    url: BUSINESS.domain,
    title: 'Psychiatric Nurse Practitioners in NJ and PA | Newpoint',
    description:
      'Psychiatric evaluation, medication management, and telehealth from two doctorate-prepared psychiatric nurse practitioners serving New Jersey and Pennsylvania.',
    locale: 'en_US',
    // The 1200x630 card is generated at app/opengraph-image.tsx and applies to
    // every route. CLIENT: replace it with a supplied asset if one exists.
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Psychiatric Nurse Practitioners in NJ and PA | Newpoint',
    description:
      'Psychiatric evaluation, medication management, and telehealth for New Jersey and Pennsylvania.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: BUSINESS.domain },
};

export const viewport: Viewport = {
  themeColor: '#FBFAF8',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cabinetGrotesk.variable} ${switzer.variable}`}>
      {/* Inter is loaded for the hero section only. The site's type stack stays
          Cabinet Grotesk + Switzer; see the hero wrapper in components/sections/Hero.tsx. */}
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a
          href="#main"
          className="focus:rounded-input focus:bg-np-surface focus:text-body focus:text-np-ink focus:ring-np-blue-600 sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:ring-2"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
