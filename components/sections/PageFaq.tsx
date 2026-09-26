import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { Accordion } from '@/components/ui/Accordion';

/**
 * FAQ block for interior pages: a flat list under a single h2, rather than the
 * homepage's two-column grouped treatment.
 *
 * The questions here are the ones specific to the page they sit on. Repeating
 * the homepage FAQ verbatim on every page would be duplicate content competing
 * with itself, which is the opposite of the point.
 */
export function PageFaq({
  items,
  heading = 'Common questions',
}: {
  items: readonly { q: string; a: string }[];
  heading?: string;
}) {
  return (
    <section className="border-np-neutral-200 border-t py-20 md:py-28">
      <Container>
        <div className="grid gap-10 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-4">
            <Reveal>
              <h2 className="text-h2 max-w-[14ch]">{heading}</h2>
            </Reveal>
          </div>
          <div className="md:col-span-8">
            <Reveal delay={0.08}>
              <Accordion items={items} headingLevel={3} idPrefix="page-faq" />
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
