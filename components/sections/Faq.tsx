import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { Accordion } from '@/components/ui/Accordion';
import { FAQ } from '@/lib/content';

/**
 * Layout family: accordion, split into two groups.
 *
 * The split into "Getting started" and "Insurance and costs" is Rula's, and it
 * maps to the two objections people actually arrive with. The audit lists both
 * as unanswered on the current site, which has no FAQ at all.
 */
export function Faq() {
  return (
    <section id="faq" className="py-24 md:py-32">
      <Container>
        <Reveal>
          <h2 className="text-h2 max-w-[20ch]">{FAQ.heading}</h2>
        </Reveal>

        <div className="mt-12 grid gap-12 md:grid-cols-2 md:gap-16">
          {FAQ.groups.map((group, gi) => (
            <Reveal key={group.title} delay={gi * 0.08}>
              <h3 className="text-h3 mb-4">{group.title}</h3>
              <Accordion items={group.items} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
