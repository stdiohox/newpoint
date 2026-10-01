import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { PageHero } from '@/components/PageHero';
import { PageFaq } from '@/components/sections/PageFaq';
import { FAQ, FAQ_PAGE } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { breadcrumbSchema, faqSchema, organizationRef } from '@/lib/schema';

/**
 * The FAQ as a page.
 *
 * WHY IT EXISTS. The navbar's "FAQ" link pointed at `/#faq`, a homepage anchor,
 * so the eight questions existed only as a band on the homepage and had no URL
 * of their own to rank, link to or share.
 *
 * NOTHING HERE IS NEW COPY. The hero takes FAQ.heading and FAQ.intro, and every
 * question, answer and group title is FAQ's own, verbatim and in source order.
 * Only FAQ_PAGE's two metadata strings are new.
 *
 * THE GROUPS SURVIVE HERE, where the homepage flattens them. components/
 * sections/Faq.tsx renders a single list with no group headings because its
 * block carries one; a dedicated page has room for "Getting started" and
 * "Insurance and costs" to do their job, so each becomes its own block under
 * its own h2. Each gets a distinct `idPrefix` — two Accordions sharing one
 * would emit duplicate element ids and cross-wire their aria-controls.
 *
 * THE FAQPage JSON-LD LIVES HERE AND ONLY HERE. app/page.tsx used to emit
 * faqSchema(FAQ.groups) alongside the homepage band; with the full set on its
 * own URL, two pages emitting the same eight questions would be two documents
 * competing for the same rich result. The homepage keeps a short preview and
 * no FAQ schema.
 *
 * No hero CTA, no visible breadcrumb, no crisis panel and no "Keep reading",
 * matching /providers.
 */
export const metadata = pageMetadata({
  title: FAQ_PAGE.metaTitle,
  description: FAQ_PAGE.metaDescription,
  path: '/faq',
});

export default function FaqPage() {
  return (
    <>
      <JsonLd
        schemas={[
          organizationRef(),
          faqSchema(FAQ.groups),
          breadcrumbSchema([{ name: 'FAQ', path: '/faq' }]),
        ]}
      />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <PageHero
          title={FAQ.heading}
          intro={FAQ.intro}
          align="center"
          copyAlign="center"
          showCta={false}
        />

        {/* One block per group, in source order. The first carries no top
            border of its own beyond PageFaq's, which reads as the divider
            between the hero and the content. */}
        {FAQ.groups.map((group) => (
          <PageFaq
            key={group.title}
            heading={group.title}
            items={group.items}
            idPrefix={`faq-${group.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
          />
        ))}
      </main>
      <Footer />
    </>
  );
}
