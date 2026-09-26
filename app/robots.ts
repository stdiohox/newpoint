import type { MetadataRoute } from 'next';
import { BUSINESS } from '@/lib/content';

/**
 * Everything on this site is meant to be indexed, so the rules are permissive
 * and the file exists mainly to declare the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${BUSINESS.domain}/sitemap.xml`,
    host: BUSINESS.domain,
  };
}
