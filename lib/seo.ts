import type { Metadata } from 'next';
import { BUSINESS } from './content';

/**
 * Per-page metadata.
 *
 * Centralised because the audit's single largest on-page finding was metadata
 * drift: the live site ships duplicate titles, 85+ character titles, and a
 * Services page whose title says "New Jersey" while its own description says
 * "Pennsylvania". Building every page's tags through one function is what stops
 * that happening again.
 *
 * `title` is the `%s` in the root layout's template, so it arrives at the
 * browser as "<title> | Newpoint". Keep it under about 50 characters to leave
 * room for the suffix inside Google's ~60 character display limit.
 */
export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  /** Root-relative, with a leading slash and no trailing slash. */
  path: string;
  /**
   * Skips the "| Newpoint" suffix. Used by the provider pages, where the
   * clinician's name plus role already fills the display limit and the name is
   * the stronger brand signal than the practice name anyway.
   */
  absoluteTitle?: boolean;
}): Metadata {
  const url = `${BUSINESS.domain}${path}`;
  const fullTitle = absoluteTitle ? title : `${title} | ${BUSINESS.shortName}`;

  /**
   * The generated card at app/opengraph-image.tsx is injected automatically
   * into the root segment's metadata only. A child segment that declares its
   * own `openGraph` object replaces the parent's wholesale, image included, so
   * interior pages shipped with no og:image at all until this was set
   * explicitly. Verified in the prerendered HTML, not assumed.
   */
  const image = {
    url: `${BUSINESS.domain}/opengraph-image`,
    width: 1200,
    height: 630,
    alt: `${BUSINESS.legalName} — mental and behavioral care in New Jersey and Pennsylvania`,
  };

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: BUSINESS.legalName,
      url,
      title: fullTitle,
      description,
      locale: 'en_US',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image.url],
    },
  };
}
