'use client';

import * as React from 'react';
import { Fragment, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHydrated } from '@/lib/useHydrated';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { EMAIL_PATTERN, HONEYPOT_FIELD, LEAD_LIMITS, PHONE_PATTERN } from '@/lib/crm/form-contract';

/**
 * The supplied OnboardingForm card, carrying this site's HIPAA-aware intake.
 * The card's layout and classes are the block's; the contents are not.
 *
 * FIELDS ARE THE EXISTING ONES, not the block's. The avatar row and the
 * username input are gone, and with them the upload control: the project
 * CLAUDE.md bans file uploads from the v1 intake outright, alongside symptoms,
 * diagnoses, medications, insurance IDs, dates of birth and any free-text box
 * that invites clinical detail. Reason for contact stays a constrained select
 * for that reason — it is the one field a visitor would otherwise use to
 * describe a symptom. Do not widen this form without a BAA-covered processor.
 *
 * TWO FIXES TO THE BLOCK. `border-forground/40` was a typo for a token that
 * does not exist, so the card rendered with no border at all; it is white/60
 * here. And `viewport={{ once: true }}` sat next to `animate`, which ignores
 * it — the card is far enough down the page that animating on mount would
 * spend the whole entrance off-screen, so it is `whileInView` now and the
 * viewport prop does what it was written to do.
 *
 * LABELS ARE VISIBLE, not placeholders. The block leads with a placeholder,
 * which disappears on first keystroke and leaves nothing naming the field —
 * WCAG 2.2 SC 3.3.2, and worse on a form a distressed visitor is filling in.
 *
 * THE GLASS is bg-white/70 over the section's blue-50 → white gradient, and
 * carries .glass-card so a prefers-reduced-transparency request gets a solid
 * card. That is the same policy globals.css already applies to .liquid-glass,
 * with white rather than ink because this card sits on a light ground.
 */

type Errors = Partial<Record<'name' | 'email' | 'phone', string>>;

/**
 * The block's own entrance.
 *
 * Reduced motion now drops these props entirely rather than zeroing their
 * timings. That used to be a trap, and it is worth knowing why it no longer
 * is: these variants are what carry the element from opacity 0 to 1, so if the
 * preference resolved after the first render (a viewer toggling it at the OS
 * level with the page already open, before this card had been scrolled into
 * view) the props would vanish while the element still sat at `hidden`, and
 * Motion does not reset inline styles it is no longer being told to drive. The
 * card stayed invisible for good.
 *
 * The `key` on the card is what defuses it: it tracks the same condition, so
 * any change to it remounts the element and Motion's stale inline styles go
 * with it. Do not drop these props on a condition that is not also in the key.
 */
const fadeUpVariants = (reduce: boolean) => ({
  hidden: { opacity: 0, y: reduce ? 0 : 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: reduce ? { duration: 0 } : ({ type: 'spring' } as const),
  },
});

/**
 * Mirrors <Input>'s classes. A native <select> is the right control for a
 * four-item constrained list and needs no JS, so the classes are repeated
 * rather than the control swapped for a scripted listbox.
 */
const SELECT_CLASS =
  'border-np-neutral-300 focus-visible:ring-np-blue-600 flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm ring-offset-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden';

const LABEL_CLASS = 'text-np-ink block text-small font-medium';
const ERROR_CLASS = 'text-np-error mt-1.5 text-small';

/**
 * The block declares `extends React.HTMLAttributes<HTMLDivElement>` and then
 * spreads the result onto a motion.div, which does not type-check: Motion
 * redefines the drag and animation handlers with its own signatures, so
 * React's DragEventHandler collides with Motion's (event, info) form. The six
 * clashing handlers are dropped rather than the whole surface widened, so the
 * public API stays "a div", which is what a caller expects.
 */
interface OnboardingFormProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd'
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'onAnimationIteration'
> {
  imageSrc: string;
  title: string;
  description: string;
  buttonText: string;
  /** The constrained reason-for-contact set. Never an open clinical prompt. */
  reasons: readonly string[];
  /** The "do not include health information" notice, rendered above the button. */
  privacyNote: string;
  /** What a stored submission shows (CONTACT.success). */
  success: { heading: string; body: string };
  /** Crisis line shown with the success and failure messages ("call 988", never "text"). */
  crisisNote: string;
  /** The practice's phone, offered whenever a submission does not go through. */
  phone: { label: string; href: string };
}

/**
 * Where the form posts: app/api/leads/route.ts, which stores the lead in the
 * staff CRM (docs/lead-crm.md) and alerts staff. Same origin, JSON, the four
 * fields only, plus a honeypot (HONEYPOT_FIELD) people never see.
 */
const LEADS_ENDPOINT = '/api/leads';

type SubmitError = 'rate_limited' | 'failed';

const OnboardingForm = React.forwardRef<HTMLDivElement, OnboardingFormProps>(
  (
    {
      className,
      imageSrc,
      title,
      description,
      buttonText,
      reasons,
      privacyNote,
      success,
      phone,
      crisisNote,
      ...props
    },
    ref
  ) => {
    const [errors, setErrors] = useState<Errors>({});
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<SubmitError | null>(null);
    const reduce = useReducedMotion();
    const hydrated = useHydrated();
    const noteId = useId();
    const fieldRefs = {
      name: useRef<HTMLInputElement>(null),
      email: useRef<HTMLInputElement>(null),
      phone: useRef<HTMLInputElement>(null),
    };
    const noticeRef = useRef<HTMLHeadingElement>(null);

    /**
     * Send focus into the notice once it replaces the form.
     *
     * Two things need this. The form that held focus has just unmounted, so
     * without it focus falls to <body> and a keyboard user restarts from the
     * top of the document. And role="status" on a node that is mounted at the
     * moment of the update is not reliably announced — several AT and browser
     * pairings only watch live regions that were already in the tree — so
     * moving focus here is what actually gets the notice read out.
     *
     * It matters more now than it did for a thank-you. The notice is not a
     * courtesy: it carries the only working way to reach the practice, and it
     * is followed by two links the visitor is being asked to use. Landing on
     * its heading puts those links next in the tab order.
     */
    useEffect(() => {
      if (submitted) noticeRef.current?.focus();
    }, [submitted]);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      /* Guards a second submit while one is in flight. The button is
         deliberately NOT `disabled` for this: disabling the element that
         currently holds focus drops focus to <body>, silently and with no
         visible indicator. aria-busy says the same thing to AT without
         moving anyone's focus. */
      if (isSubmitting) return;
      const data = new FormData(e.currentTarget);
      const name = String(data.get('name') ?? '').trim();
      const email = String(data.get('email') ?? '').trim();
      const phone = String(data.get('phone') ?? '').trim();

      const next: Errors = {};
      // Same rules as /api/leads (lib/crm/form-contract.ts), so a value the
      // server would refuse is caught here with a message about that field.
      if (!name) next.name = 'Please enter your name.';
      else if (name.length > LEAD_LIMITS.name) next.name = 'Please shorten your name.';
      if (!email) next.email = 'Please enter an email address.';
      else if (email.length > LEAD_LIMITS.email || !EMAIL_PATTERN.test(email))
        next.email = 'Please check this email address.';
      if (phone && !PHONE_PATTERN.test(phone)) next.phone = 'Please check this phone number.';

      setErrors(next);
      /*
       * Focus the first field that failed. Without it the only feedback is
       * text that appears below the fold of the caret: focus stays on the
       * Send button, no live region fires, and a screen-reader user is told
       * nothing at all about why nothing happened. Landing on the field
       * carries its label, its aria-invalid and its error text in one go.
       */
      if (Object.keys(next).length > 0) {
        const first = (['name', 'email', 'phone'] as const).find((k) => next[k]);
        if (first) fieldRefs[first].current?.focus();
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);
      try {
        /*
         * Stores the lead in the staff CRM (app/api/leads). CONTACT.success
         * renders only on a 201, i.e. only once the lead is actually stored:
         * someone who believes they are on a waiting list does not call, so a
         * receipt is never claimed for a submission nothing took. Do not add
         * fields here: name, email, phone and the fixed reason only (CLAUDE.md
         * "Compliance").
         */
        const response = await fetch(LEADS_ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          // A hung request falls through to the catch below and its phone fallback.
          signal: AbortSignal.timeout(15_000),
          body: JSON.stringify({
            name,
            email,
            phone,
            reason: String(data.get('reason') ?? ''),
            [HONEYPOT_FIELD]: String(data.get(HONEYPOT_FIELD) ?? ''),
          }),
        });
        if (response.status === 201) {
          setSubmitted(true);
        } else if (response.status === 400) {
          // The server names the fields it refused; show them like local errors.
          const refused = ((await response.json().catch(() => ({}))) as { fields?: string[] }).fields ?? [];
          const fieldErrors: Errors = {};
          if (refused.includes('name')) fieldErrors.name = 'Please check your name.';
          if (refused.includes('email')) fieldErrors.email = 'Please check this email address.';
          if (refused.includes('phone')) fieldErrors.phone = 'Please check this phone number.';
          setErrors(fieldErrors);
          const first = (['name', 'email', 'phone'] as const).find((k) => fieldErrors[k]);
          if (first) fieldRefs[first].current?.focus();
          else setSubmitError('failed');
        } else {
          setSubmitError(response.status === 429 ? 'rate_limited' : 'failed');
        }
      } catch {
        /* Not swallowed. try/finally with no catch would leave a rejected
           submission looking exactly like a misclick: spinner stops, form
           unchanged, nothing said. Points at the phone, which always works. */
        setSubmitError('failed');
      } finally {
        setIsSubmitting(false);
      }
    }

    /* Same props either way once hydrated; only the timings change. See
       fadeUpVariants.

       Before hydration NO motion props are passed, so Motion serialises no
       inline style and the form is present and readable in the server HTML.
       Previously every field shipped at opacity 0, which meant the entire
       contact form — the only way to reach the practice from this page —
       was invisible to anyone whose JS did not run. The hidden state is now
       the .js-gated [data-enter="up-sm"] rule in globals.css; when these
       props arrive Motion reads that computed style as its starting point.

       Note the direction of the gate: props are ABSENT then PRESENT, never
       the reverse. The warning on fadeUpVariants is about props disappearing
       while an element sits at `hidden`, which would strand it invisible.
       `hydrated` only ever goes false to true, so that cannot happen here,
       and the props stay passed regardless of `reduce` afterwards. */
    /* Reduced motion gets NO start state, rather than an instant one. The card
       usually sits below the fold, so `whileInView` has not fired yet and the
       element would just sit at the `hidden` variant — invisible, indefinitely,
       for the visitor least able to tolerate it. */
    const animateIn = hydrated && !reduce;

    const container = animateIn
      ? {
          initial: 'hidden' as const,
          whileInView: 'show' as const,
          viewport: { once: true, amount: 0.15 },
          variants: {
            hidden: {},
            show: { transition: { staggerChildren: 0.15 } },
          },
        }
      : {};
    const item = {
      'data-enter': 'up-sm',
      ...(animateIn ? { variants: fadeUpVariants(false) } : {}),
    };

    /*
     * The keyed Fragment forces one remount at hydration, and it is
     * load-bearing.
     *
     * Motion only reads `initial` when an element mounts. Handing the variants
     * over afterwards leaves it believing it is already at `show` while it has
     * written no inline style at all, so the .js [data-enter] rule keeps every
     * field invisible FOR GOOD, with JS working perfectly normally. Remounting
     * lets Motion mount at `hidden` and animate out of it properly.
     *
     * The key goes on a Fragment rather than on the motion.div: keying the
     * element a forwardRef component returns makes React emit a spurious
     * "each child in a list should have a unique key" warning against
     * ForwardRef(motion.div). Same remount, no false positive.
     *
     * Safe here because it happens in the same tick as hydration, on an empty
     * form: there is nothing typed to lose. Do not copy this onto a form that
     * can already hold user input.
     */
    return (
      <Fragment key={animateIn ? 'motion' : 'static'}>
        <motion.div
          {...container}
          className={cn(
            'glass-card w-full max-w-md overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-lg backdrop-blur-lg',
            className
          )}
          ref={ref}
          {...props}
        >
          <motion.div {...item} className="relative h-[180px] w-full">
            {/* Decorative. The card's own heading and copy already say what this
              section is; describing the photograph would only repeat it. */}
            <Image
              src={imageSrc}
              alt=""
              fill
              sizes="(min-width: 768px) 576px, 100vw"
              className="object-cover"
            />
          </motion.div>

          <div className="space-y-6 p-8">
            {/* The only centred block. Everything below it is a form, and centred
              labels above left-aligned fields read as a ransom note. */}
            <motion.div {...item} className="space-y-2 text-center">
              <h2 className="text-np-blue-800 text-2xl font-bold">{title}</h2>
              {/* The invitation goes once the form is sent. Leaving it up put
                "Send us your contact details" directly above "Thank you",
                which reads as though the submission had not registered. The
                h2 stays either way: it is this section's only heading, and
                dropping it would leave the page's outline with a hole. */}
              {!submitted && <p className="text-np-neutral-600">{description}</p>}
            </motion.div>

            {submitted ? (
              /*
               * Shown only after the lead is stored (a 201). role="status" is
               * polite rather than assertive: the focus move above is what
               * guarantees the announcement, and an alert would interrupt on
               * top of it.
               */
              <div role="status" className="py-4">
                {/* tabIndex={-1} so the effect above can move focus here. It is
                  not in the tab order; it is only a focus destination. */}
                <h3 ref={noticeRef} tabIndex={-1} className="text-h3 focus:outline-none">
                  {success.heading}
                </h3>
                <p className="text-body text-np-neutral-600 mt-3">{success.body}</p>
                <p className="text-body mt-2">
                  <a href={phone.href} className="text-np-blue-600 underline underline-offset-2">
                    {phone.label}
                  </a>
                </p>
                <p className="text-small text-np-neutral-600 mt-4">{crisisNote}</p>
              </div>
            ) : (
              // method="post" matters even though onSubmit always preventDefaults
              // it. Before hydration, or if the JS fails, a form with no method
              // defaults to GET against the current URL — which would put a name,
              // an email, a phone number and "Existing patient" into the query
              // string of a psychiatric practice's homepage, and from there into
              // browser history, server access logs and any onward Referer. POST
              // keeps it out of the URL.
              //
              // aria-busy sits on the form, not the button: the whole form is
              // what is in flight, and Button's props are a closed type that
              // takes no ARIA attributes.
              <form
                onSubmit={handleSubmit}
                method="post"
                noValidate
                aria-busy={isSubmitting}
                className="space-y-4"
              >
                <motion.div {...item}>
                  <label htmlFor="name" className={LABEL_CLASS}>
                    Name
                  </label>
                  <Input
                    ref={fieldRefs.name}
                    id="name"
                    name="name"
                    maxLength={LEAD_LIMITS.name}
                    type="text"
                    autoComplete="name"
                    required
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                    className="mt-2"
                  />
                  {errors.name && (
                    <p id="name-error" className={ERROR_CLASS}>
                      {errors.name}
                    </p>
                  )}
                </motion.div>

                <motion.div {...item}>
                  <label htmlFor="email" className={LABEL_CLASS}>
                    Email
                  </label>
                  <Input
                    ref={fieldRefs.email}
                    id="email"
                    name="email"
                    maxLength={LEAD_LIMITS.email}
                    type="email"
                    autoComplete="email"
                    required
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    className="mt-2"
                  />
                  {errors.email && (
                    <p id="email-error" className={ERROR_CLASS}>
                      {errors.email}
                    </p>
                  )}
                </motion.div>

                <motion.div {...item}>
                  <label htmlFor="phone" className={LABEL_CLASS}>
                    Phone <span className="text-np-neutral-600 font-normal">(optional)</span>
                  </label>
                  <Input
                    ref={fieldRefs.phone}
                    id="phone"
                    name="phone"
                    maxLength={LEAD_LIMITS.phoneMax}
                    type="tel"
                    autoComplete="tel"
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? 'phone-error' : undefined}
                    className="mt-2"
                  />
                  {errors.phone && (
                    <p id="phone-error" className={ERROR_CLASS}>
                      {errors.phone}
                    </p>
                  )}
                </motion.div>

                {/* Honeypot. Off-screen, out of the tab order and hidden from
                  assistive technology, so only a bot fills it in; the API
                  then discards the submission. */}
                <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                  <input name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
                </div>

                <motion.div {...item}>
                  <label htmlFor="reason" className={LABEL_CLASS}>
                    Reason for contact
                  </label>
                  {/* Described by the privacy notice below, which the original
                    markup reached for with id="reason-help" but never wired up.
                    This is the field most likely to invite a clinical detail,
                    so it is the one that should carry the warning. */}
                  <select
                    id="reason"
                    name="reason"
                    defaultValue={reasons[0]}
                    aria-describedby={noteId}
                    className={cn(SELECT_CLASS, 'mt-2')}
                  >
                    {reasons.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </motion.div>

                <motion.div {...item} className="space-y-4 pt-2">
                  <p id={noteId} className="text-small text-np-neutral-600">
                    {privacyNote}
                  </p>
                  {submitError && (
                    <p role="alert" className={ERROR_CLASS}>
                      {submitError === 'rate_limited'
                        ? 'We’ve already received a few requests from you today. Please call the practice at '
                        : 'We couldn’t send that. Please try again, or call the practice at '}
                      <a href={phone.href} className="underline underline-offset-2">
                        {phone.label}
                      </a>
                      . {crisisNote}
                    </p>
                  )}
                  {/* Persistent, so "Sending" is announced: the spinner is aria-hidden. */}
                  <p role="status" className="sr-only">
                    {isSubmitting ? 'Sending…' : ''}
                  </p>
                  <Button type="submit" size="lg" className="w-full">
                    {isSubmitting && (
                      <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {buttonText}
                  </Button>
                </motion.div>
              </form>
            )}
          </div>
        </motion.div>
      </Fragment>
    );
  }
);
OnboardingForm.displayName = 'OnboardingForm';

export { OnboardingForm };
