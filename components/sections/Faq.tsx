import { FaqSections, type FaqItem } from '@/components/ui/faq-sections';
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
export function Faq() {
  /*
   * The flatMap is annotated because `as const` makes groups a tuple of
   * literal-typed objects: unannotated, it infers the FIRST group's exact
   * question strings as the element type, which the second group then fails to
   * satisfy. Widening to FaqItem[] is the fix, not a cast.
   */
  const faqs = FAQ.groups.flatMap((g): FaqItem[] => [...g.items]);

  return (
    <section id="faq" className="py-20 md:py-28">
      <FaqSections
        eyebrow={FAQ.eyebrow}
        heading={FAQ.heading}
        intro={FAQ.intro}
        faqs={faqs}
        imageSrc="/images/faq/faq.webp"
        imageWidth={800}
        imageHeight={597}
      />
    </section>
  );
}
