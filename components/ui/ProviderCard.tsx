'use client';

import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react';
import { useHydrated } from '@/lib/useHydrated';

/**
 * A provider card for /providers.
 *
 * ADAPTED FROM THE team-section PATTERN, NOT PORTED. That source is a shadcn
 * composition — Card, Badge and Button over the semantic palette (bg-card,
 * text-muted-foreground, border-border) — none of which this repo installs or
 * defines, and Tailwind v4 emits nothing for an unknown utility, so pasting it
 * would have shipped an unstyled card wired to three dependencies that are not
 * here. components/ui/badge.tsx records the same trap. What is taken is the
 * composition: centred circular portrait, name, a credentials pill, a location
 * line, the bio, and specialty pills.
 *
 * DROPPED FROM THE SOURCE, by instruction and on merit: the sparkles, the
 * animated background blobs, the social icons, the "Join our team" CTA and the
 * gradient heading. The practice has two providers, no public social accounts
 * in research/, and is not hiring on this page.
 *
 * A CLIENT COMPONENT, because the tilt needs pointer position. It takes plain
 * props rather than the Provider object so lib/content.ts stays out of the
 * browser bundle — the rule lib/nav.ts's header sets out. It also renders the
 * portrait itself instead of reusing <ProviderPortrait />, which is a server
 * component and cannot be imported across this boundary.
 *
 * A STRETCHED LINK, AND IT IS THE BUTTON AT THE FOOT OF THE CARD. The heading is
 * plain text; the "View full profile" button carries `after:absolute
 * after:inset-0`, so the whole card is one target and one tab stop while the
 * visible affordance is a real button.
 *
 * Wrapping the entire card in the <a> was the first build and it made the
 * link's accessible name the concatenation of the name, the credentials, the
 * licence line, the whole bio and all eleven specialty pills — over 400
 * characters, recited on every Tab and shown as one unbroken run in a screen
 * reader's links list. The name is now the button's aria-label, which extends
 * the visible label rather than replacing it: "View full profile" is the first
 * thing in it, so SC 2.5.3 holds and speech input still activates it by what is
 * on screen.
 *
 * The focus ring is drawn on the CARD through `has-[a:focus-visible]`, so the
 * indicator matches the hit area rather than outlining the pill alone.
 *
 * The portrait is alt="" because the name is read immediately after it; a
 * descriptive alt would have the name and credentials announced twice.
 */

const MAX_TILT = 4;

export type ProviderCardData = {
  slug: string;
  displayName: string;
  credentials: string;
  licensed: string;
  bio: string;
  treats: readonly string[];
  image: { webp1120: string };
};

export function ProviderCard({ provider }: { provider: ProviderCardData }) {
  const reduce = useReducedMotion();
  /* useReducedMotion() resolves to null on the server, so gating the style on
     `reduce` alone renders the transform during SSR and drops it on the client's
     first render — a hydration mismatch on the style attribute that React does
     not patch, leaving a reduced-motion user with an inline preserve-3d after
     all. Reveal.tsx records the same trap. Nothing 3D is written until the
     client has hydrated AND has said it wants motion. */
  const hydrated = useHydrated();
  const tilt = hydrated && !reduce;

  /* Pointer position within the card, in [-0.5, 0.5]. */
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  /* Spring so the card settles rather than snapping, and so leaving it eases
     back to flat instead of cutting. */
  const sx = useSpring(px, { stiffness: 220, damping: 22, mass: 0.4 });
  const sy = useSpring(py, { stiffness: 220, damping: 22, mass: 0.4 });

  /* MAX 4 DEGREES, and the sign is inverted on rotateX so the card leans TOWARD
     the pointer: moving down the card should tip its bottom edge away, which is
     a positive rotateX for a negative y offset. */
  const rotateY = useTransform(sx, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    /* Pointer-driven only. Under reduced motion nothing is written to the
       motion values at all, so the transform never leaves its resting state —
       cheaper and more certain than animating to zero. */
    if (!tilt) return;
    /* Mouse only. onPointerMove fires for touch too, so a finger dragging the
       page tilted the card under it. */
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };

  const onLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    /* perspective on the wrapper, not the card: a rotation without it is a flat
       skew rather than a tilt. transform-gpu keeps the text off the CPU raster
       path, which is where a rotated card goes soft. */
    <div
      /* h-full, or the chain breaks. The grid stretches the <li>, but this
         wrapper would otherwise shrink-wrap its content — and the motion div
         and the Link below both resolve their own h-full against it, so the
         two cards ended up at their own content heights inside equal cells. */
      className="h-full"
      style={{ perspective: 900 }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <motion.div
        style={tilt ? { rotateX, rotateY, transformStyle: 'preserve-3d' } : undefined}
        className="h-full"
      >
        {/* `relative` anchors the stretched ::after. The focus ring is driven
            by has-[a:focus-visible] so it lands on the CARD, matching the hit
            area the ::after creates, rather than drawing a 2px box around the
            name alone. */}
        <div className="rounded-card bg-np-surface ease-np-out has-[a:focus-visible]:outline-np-blue-600 relative flex h-full flex-col items-center p-8 text-center ring-1 ring-[var(--np-alpha-ink-08)] transition-shadow duration-[180ms] hover:shadow-[var(--shadow-np-card)] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 motion-reduce:transition-none">
          {/* THE 1120 MASTER, NOT THE 560, and next/image builds the srcset.
              It will not accept a hand-written srcSet — it generates one from
              `sizes` and deviceSizes — so the source has to be the larger of
              the two pre-processed files or a 3x screen has nothing to resolve
              to at 128 CSS px. */}
          <Image
            src={provider.image.webp1120}
            alt=""
            width={128}
            height={128}
            sizes="128px"
            quality={82}
            loading="lazy"
            className="size-32 rounded-full object-cover"
          />

          {/* THE HEADING IS NO LONGER THE LINK — the button at the foot of the
              card is. One link and one tab stop per card either way. */}
          <h2 className="text-h3 text-np-ink mt-5">{provider.displayName}</h2>

          {/* The credentials pill. A span, not a Badge import — the treatment is
              this repo's existing chip token. */}
          <span className="rounded-chip bg-np-blue-50 text-small text-np-blue-700 mt-3 px-3 py-1 font-medium">
            {provider.credentials}
          </span>

          <p className="text-small text-np-neutral-600 mt-3 flex items-center gap-1.5">
            <MapPin aria-hidden="true" size={15} strokeWidth={1.75} className="shrink-0" />
            {provider.licensed}
          </p>

          <p className="text-body text-np-neutral-600 mt-5 max-w-[46ch]">{provider.bio}</p>

          {/* SPECIALTY PILLS, from PROVIDERS[].treats — the data already exists,
              which is the condition for showing them at all.

              EVERY ITEM IS RENDERED, not a first-few slice. A truncated list of
              conditions on a clinical page invites the reading that anything
              missing is not treated, and the card is the only place these
              appear outside the provider's own page. Ten or eleven short pills
              wrap to three lines, which is the cost of not implying an
              exclusion. No count or "and more" label, which would be new copy. */}
          <ul role="list" className="mt-6 flex flex-wrap justify-center gap-2">
            {provider.treats.map((item) => (
              <li
                key={item}
                className="rounded-chip bg-np-neutral-100 text-small text-np-neutral-700 px-2.5 py-1"
              >
                {item}
              </li>
            ))}
          </ul>

          {/* THE BUTTON IS THE STRETCHED LINK. `after:absolute after:inset-0`
              pins its hit area to the card, so the whole card is still one
              target and one tab stop while the visible affordance is a real
              button at the foot of the card rather than an underlined name.

              mt-auto pins it to the bottom whatever the bio and pill list above
              run to, which is what keeps the two buttons on one line when the
              cards are stretched to equal height.

              THE ACCESSIBLE NAME IS THE aria-label, not the visible text. "View
              full profile" repeated on both cards tells a screen-reader user
              reading a links list nothing about which profile; naming the
              provider fixes that. SC 2.5.3 is satisfied because the visible
              label — "View full profile" — is contained in the accessible name,
              in that order, which is what Label in Name requires. */}
          <div className="mt-auto pt-7">
            <Button
              href={`/providers/${provider.slug}`}
              variant="quiet"
              /* THE CREDENTIALS ARE IN THE ACCESSIBLE NAME, not just beside it
                 on screen. An accessible name is a serialised string — there is
                 no "beside" in a links list — so a bare "Dr. Funmilayo
                 Whitaker" here would be the one unqualified title on the site.
                 components/sections/Providers.tsx does the same with `role`. */
              ariaLabel={`View full profile for ${provider.displayName}, ${provider.credentials}`}
              /* THE PRESS SCALE MUST NOT APPLY TO THIS INSTANCE.
                 Button's base carries `active:scale-[0.98]`, and in Tailwind v4
                 that sets the `scale` property. Any non-`none` scale makes the
                 element a containing block for its own absolutely positioned
                 descendants — so the instant mousedown landed, this link's
                 stretched ::after stopped resolving against the card and
                 collapsed to the button's own box. Mouseup over the bio or the
                 pills then had no link under it and the click dispatched to the
                 ancestor: pressing the card body did nothing at all, while
                 pressing the button worked, which is the hardest version of
                 this bug to notice. Measured both ways before and after.
                 The `!` is load-bearing: same specificity as the base utility,
                 so without it the winner is CSS source order.

                 outline-transparent, NOT outline-none: the card already draws a
                 focus ring through has-[a:focus-visible], and the `quiet`
                 variant draws its own, so a keyboard user saw two rings in two
                 different blues — a tight np-blue-900 one on the pill inside a
                 wider np-blue-600 one on the card. The card's is the one that
                 matches the hit area, so the button's is suppressed. Transparent
                 rather than none so forced-colors mode still has an outline to
                 repaint. */
              className="after:absolute after:inset-0 active:[scale:none]! focus-visible:outline-transparent"
            >
              View full profile
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
