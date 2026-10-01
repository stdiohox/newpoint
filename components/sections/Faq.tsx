import Link from 'next/link';
import { FaqSections, type FaqItem } from '@/components/ui/faq-sections';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { FAQ } from '@/lib/content';

/**
 * Layout family: image beside an accordion.
 *
 * The markup is now <FaqSections />, the supplied block. This file is the
 * section wrapper and the content binding: it keeps the id and flattens the
 * content into the shape the block takes.
 *
 * THE TWO GROUPS ARE FLATTENED. FAQ.groups splits the questions into "Getting
 * started" and "Insurance and costs", and the block carries a single list with
 * no group headings, so both groups run together in source order. The eight
 * questions and answers are unchanged, verbatim, and none is added or dropped.
 * The group titles are the only thing lost.
 *
 * That also keeps the JSON-LD honest without touching it: app/page.tsx emits
 * faqSchema(FAQ.groups), which already flattens every group into one
 * mainEntity array, so the schema lists exactly the eight questions rendered
 * here, in the same order.
 *
 * PADDING is py-20 md:py-28, down from py-24 md:py-32, matching
 * <InsuranceProof /> directly above it. Measured on the page, the gap from the
 * insurance section to this one goes 176 -> 160 on mobile and 240 -> 224 at
 * desktop. It cannot go much below that from this side alone: InsuranceProof
 * contributes 80/112 of it on its own, so matching the deliberately tight
 * 112/72 that separates Providers from What to expect would need that section's
 * bottom padding to move too, which was not in scope.
 *
 * Server component. <FaqSections /> is the only client code, and it is a leaf.
 */
/**
 * A PREVIEW NOW, NOT THE WHOLE SET. /faq carries all eight questions under
 * their group headings; this band shows the first four and links there.
 *
 * Four, not eight, because the full list on both URLs would be the same eight
 * questions and answers on two indexable pages, competing with each other —
 * which is the duplicate-content problem PageFaq's own note already describes.
 * The FAQPage JSON-LD moved to /faq with the full set for the same reason, so
 * app/page.tsx no longer emits faqSchema.
 *
 * The four are the first four in source order, so the preview is a prefix of
 * the page rather than a selection anyone has to maintain. All of them are
 * "Getting started", which is the right half to show a first-time visitor.
 */
const PREVIEW_COUNT = 4;

export function Faq() {
  /*
   * The flatMap is annotated because `as const` makes groups a tuple of
   * literal-typed objects: unannotated, it infers the FIRST group's exact
   * question strings as the element type, which the second group then fails to
   * satisfy. Widening to FaqItem[] is the fix, not a cast.
   */
  const faqs = FAQ.groups.flatMap((g): FaqItem[] => [...g.items]).slice(0, PREVIEW_COUNT);

  return (
    <section id="faq" className="py-20 md:py-28">
      <FaqSections
        eyebrow={FAQ.eyebrow}
        heading={FAQ.heading}
        intro={FAQ.intro}
        faqs={faqs}
        imageSrc="/images/faq/faq.webp"
        imageWidth={2000}
        imageHeight={1493}
      />

      <Container>
        {/* The link out. It names the destination rather than saying "read
            more", so its accessible name says where it goes when read out of
            context. */}
        <Reveal>
          <Link
            href="/faq"
            className="text-body text-np-blue-600 ease-np-out mt-10 inline-flex items-center gap-1 font-medium underline-offset-4 transition-colors duration-[180ms] hover:underline focus-visible:underline motion-reduce:transition-none"
          >
            All frequently asked questions
            <span aria-hidden="true">→</span>
          </Link>
        </Reveal>
      </Container>
    </section>
  );
}
