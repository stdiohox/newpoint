import { Footer } from '@/components/Footer';
import { Hero } from '@/components/sections/Hero';
import { InsuranceProof } from '@/components/sections/InsuranceProof';
import { Providers } from '@/components/sections/Providers';
import { WhatToExpect } from '@/components/sections/WhatToExpect';
import { FeaturedServices } from '@/components/sections/FeaturedServices';
import { Faq } from '@/components/sections/Faq';
import { ContactCrisis } from '@/components/sections/ContactCrisis';
import { JsonLd } from '@/components/JsonLd';
import { medicalClinicSchema, providersSchema, serviceSchemaFor, faqSchema } from '@/lib/schema';
import { FAQ, SERVICE_PAGES } from '@/lib/content';

/**
 * Seven sections, seven distinct layout families, in the order confirmed in
 * design-synthesis.md Part 4. No two consecutive sections share a family.
 *
 * <WhatToExpect /> took <GettingStarted />'s slot in that count rather than
 * adding an eighth: both are the numbered-process family and both describe the
 * same journey, so running the two together would have restated the process and
 * put one layout family on the page twice. The new one carries four steps
 * instead of three and sits directly after <Providers />, so the page answers
 * "who will I see" and then "what happens" before it sells any service.
 *
 * The GETTING_STARTED copy is still live: /new-patients renders it through its
 * own markup. The GettingStarted COMPONENT, however, is now imported by
 * nothing, since this page was its only consumer. See the note in
 * WhatToExpect.tsx.
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
    faqSchema(FAQ.groups),
  ];

  return (
    <>
      <JsonLd schemas={schemas} />

      <div id="top" />
      {/* The primary navigation now lives inside <Hero />, per the hero spec. */}
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <Hero />
        <InsuranceProof />
        <Providers />
        <WhatToExpect />
        <FeaturedServices />
        <Faq />
        <ContactCrisis />
      </main>
      <Footer />
    </>
  );
}
