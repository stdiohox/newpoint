import { LifeBuoy } from 'lucide-react';
import { CRISIS } from '@/lib/content';

/**
 * Crisis guidance, in one place.
 *
 * This is deliberately shared rather than copied. The homepage and /contact
 * each carried their own version and they had already drifted apart — one kept
 * a blue-600 left bar the other had dropped — which on a panel routing people
 * to 988 is not a cosmetic inconsistency. There is one treatment now and both
 * routes render this.
 *
 * Styled calm, not as an alarm banner. The audit flags the total absence of
 * crisis guidance on the current site as a gap, and CLAUDE.md requires it. A
 * warning-callout bar was the one element raising the temperature, so the panel
 * is a plain white card and the urgency lives in the size of the numbers.
 *
 * Each number is BOTH a tel: link and a labelled button. The number carries the
 * link because that is what it does everywhere else on this site — Footer,
 * not-found, new-patients and PageCta all make it tappable — and someone who
 * learned that there will try it here. The buttons carry the explicit actions
 * because "Text 988" has no other way to be reachable.
 */
export function CrisisPanel({
  headingAs: Heading = 'h3',
  headingId = 'crisis-heading',
  className = '',
}: {
  /** Pick the level that keeps the page's outline correct. */
  headingAs?: 'h2' | 'h3';
  headingId?: string;
  className?: string;
}) {
  return (
    <aside
      aria-labelledby={headingId}
      className={`bg-np-surface border-np-neutral-200 rounded-2xl border p-8 ${className}`}
    >
      <div className="flex items-start gap-4">
        <span className="bg-np-blue-50 text-np-blue-900 flex size-10 shrink-0 items-center justify-center rounded-full">
          <LifeBuoy aria-hidden="true" size={20} strokeWidth={1.75} />
        </span>
        <div>
          {/* 24px, carrying the h3 token's weight and tracking at a size the
              scale does not define. */}
          <Heading
            id={headingId}
            className="font-display text-np-ink text-2xl leading-tight font-[550] tracking-[-0.01em]"
          >
            {CRISIS.heading}
          </Heading>
          <p className="text-small text-np-neutral-600 mt-2">{CRISIS.body}</p>
        </div>
      </div>

      <ul role="list" className="mt-6 space-y-4">
        {CRISIS.items.map((item) => (
          <li key={item.label} className="bg-np-neutral-50 rounded-xl p-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {/* aria-label, not bare "988": in a screen reader's links list the
                  number alone is indistinguishable from any other three digits
                  on the page. Same wording as Footer and PageCta. */}
              <a
                href={item.href}
                aria-label={`${item.label}, ${item.title}`}
                className="font-display text-np-blue-900 ease-np-out hover:text-np-blue-700 text-[2.5rem] leading-none font-[550] tracking-[-0.02em] underline-offset-4 transition-colors duration-[180ms] hover:underline focus-visible:underline motion-reduce:transition-none"
              >
                {item.label}
              </a>
              <p className="text-np-ink font-medium">{item.title}</p>
            </div>
            <p className="text-small text-np-neutral-600 mt-3">{item.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {actionsFor(item).map((action) => (
                <a
                  key={action.label}
                  href={action.href}
                  /* The visible label is just "Call 988". The service it reaches
                     is the part a screen-reader user needs before committing to
                     a phone call. */
                  aria-label={`${action.label}, ${item.title}`}
                  className={`${actionBase} ${action.filled ? actionFilled : actionOutlined}`}
                >
                  {action.label}
                </a>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

type CrisisItem = (typeof CRISIS.items)[number];

/**
 * Buttons per crisis item. Both hrefs derive from item.href, so lib/content.ts
 * is the single source for the number itself, and whether a line takes SMS is
 * read off the item rather than decided here — see the note on CRISIS.
 * item.label is display copy and is never parsed as a number: it only labels
 * the button.
 */
function actionsFor(item: CrisisItem) {
  const number = item.href.replace(/^tel:/, '');
  return [
    { label: `Call ${item.label}`, href: item.href, filled: true },
    ...(item.textable
      ? [{ label: `Text ${item.label}`, href: `sms:${number}`, filled: false }]
      : []),
  ];
}

/**
 * Crisis buttons are local rather than <Button />: they need a np-blue-900 fill
 * the shared variants do not carry, and a 44px minimum target that
 * <Button size="md"> (≈38px) does not reach. Everything else follows
 * Button.tsx — pill radius per the documented radius rule, 180ms np-out, the
 * same active press, and an explicit focus ring.
 *
 * Contrast on np-neutral-50: white on np-blue-900 is 16.1:1, np-blue-900 text
 * and its 1px ring are 15.5:1. Both clear AA with room.
 */
const actionBase =
  'inline-flex min-h-11 items-center justify-center rounded-pill px-5 text-small font-medium ' +
  'transition-colors duration-[180ms] ease-np-out active:scale-[0.98] motion-reduce:transition-none ' +
  'focus-visible:outline-np-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2';

const actionFilled = 'bg-np-blue-900 text-white hover:bg-np-blue-700';
const actionOutlined =
  'text-np-blue-900 hover:bg-np-blue-50 ring-np-blue-900 bg-transparent ring-1';
