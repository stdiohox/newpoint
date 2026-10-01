import { Footer } from '@/components/Footer';
import { Hero } from '@/components/sections/Hero';
import { InsuranceProof } from '@/components/sections/InsuranceProof';
import { Providers } from '@/components/sections/Providers';
import { WhatToExpect } from '@/components/sections/WhatToExpect';
import { FeaturedServices } from '@/components/sections/FeaturedServices';
import { Faq } from '@/components/sections/Faq';
import { ContactCrisis } from '@/components/sections/ContactCrisis';
import { JsonLd } from '@/components/JsonLd';
import { medicalClinicSchema, providersSchema, serviceSchemaFor } from '@/lib/schema';
import { SERVICE_PAGES } from '@/lib/content';

/**
 * Seven sections, seven distinct layout families. No two consecutive sections
 * share a family.
 *
 * ORDER, after the hero: services, providers, what to expect, insurance, FAQ,
 * contact and crisis. This is NOT the order in design-synthesis.md Part 4,
 * which put insurance at position 2 directly under the hero. The page now
 * answers what we treat, who you will see and what happens first, and raises
 * cost and coverage once the visitor has a reason to care. design-synthesis.md
 * still documents the original sequence and has not been rewritten.
 *
 * <WhatToExpect /> took <GettingStarted />'s slot in that count rather than
 * adding an eighth: both are the numbered-process family and both describe the
 * same journey, so running the two together would have restated the process and
 * put one layout family on the page twice. The new one carries four steps
 * instead of three and sits directly after <Providers />, so the page answers
 * "who will I see" and then "what happens" before it sells any service.
 *
 * NOTE: <WhatToExpect /> and <InsuranceProof /> are now adjacent and both set
 * bg-np-neutral-100, so no tonal seam separates them. Their layout families
 * still differ (numbered rail, then payer wall), so this is a visual question,
 * not a repetition one, and it was not in scope to change either ground.
 *
 * The GETTING_STARTED copy is still live: /new-patients renders it through its
 * own markup. The GettingStarted COMPONENT has been deleted, since this page
 * was its only consumer. See the note in WhatToExpect.tsx.
 *
 * Statically rendered. Only the accordion, the mobile nav, the contact form,
 * and the reveal wrapper are client components, each an isolated leaf.
 */
export default function Home() {
  /**
   * The full provider and service nodes ship alongside the organization, not
   * just `{'@id': ...}` stubs. Search engines evaluate structured data per
   * document, so a stub whose full node only exists on another URL resolves to
   * nothing here — `employee` and `availableService` would both be inert.
   */
  const schemas = [
    medicalClinicSchema(),
    ...providersSchema(),
    ...SERVICE_PAGES.map(serviceSchemaFor),
    /* NO faqSchema HERE. The FAQPage node lives on /contact with the full set
       of questions (it was /faq until that page was merged in, 2026-10-01);
       this page shows only a four-question preview, and two documents emitting
       the same eight questions would compete for one rich result. See
       components/sections/Faq.tsx. */
  ];

  return (
    <>
      <JsonLd schemas={schemas} />

      <div id="top" />
      {/* The primary navigation is <Navbar1 />, rendered once in app/layout.tsx
          for every route. It is not part of this page or of <Hero />. */}
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <Hero />
        <FeaturedServices />
        <Providers />
        <WhatToExpect />
        <InsuranceProof />
        <Faq />
        <ContactCrisis />
      </main>
      <Footer />
    </>
  );
}
