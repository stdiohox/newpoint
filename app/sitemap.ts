import type { MetadataRoute } from 'next';
import { BUSINESS, ROUTES } from '@/lib/content';

/**
 * XML sitemap, generated from the single ROUTES registry in lib/content.ts so a
 * new page cannot be shipped unlisted.
 *
 * The live site's sitemap.xml lists five URLs, two of which are unedited
 * website-builder blog templates from 2017 that are fully indexable. Those are
 * not carried over. Nothing here is unlinked from navigation.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return ROUTES.map((route) => ({
    url: `${BUSINESS.domain}${route.path === '/' ? '' : route.path}`,
    lastModified,
    changeFrequency: 'monthly' as const,
    priority: route.priority,
  }));
}
