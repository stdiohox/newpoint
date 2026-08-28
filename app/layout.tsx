import type { Metadata, Viewport } from 'next';
import { cabinetGrotesk, switzer } from './fonts';
import { BUSINESS } from '@/lib/content';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(BUSINESS.domain),
  title: {
    default: 'Newpoint Healthcare Services | Psychiatric Care in NJ and PA',
    template: `%s | ${BUSINESS.shortName}`,
  },
  description:
    'Outpatient psychiatric care for New Jersey and Pennsylvania. Psychiatric evaluation, medication management, and telehealth from two doctorate-prepared nurse practitioners.',
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
    title: 'Newpoint Healthcare Services | Psychiatric Care in NJ and PA',
    description:
      'Psychiatric evaluation, medication management, and telehealth from two doctorate-prepared psychiatric nurse practitioners serving New Jersey and Pennsylvania.',
    locale: 'en_US',
    // CLIENT: no OG image asset exists. The current site reuses the logo JPEG.
    // Supply a 1200x630 social card, or approve generating one from the wordmark.
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Newpoint Healthcare Services | Psychiatric Care in NJ and PA',
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
