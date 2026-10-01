'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
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
 * A STRETCHED LINK, NOT A WRAPPING ONE. The whole card is still one target and
 * one tab stop, but only the NAME is inside the <a>; an ::after pseudo-element
 * pinned to the card's box collects the clicks.
 *
 * Wrapping the entire card was the obvious first build and it made the link's
 * accessible name the concatenation of the name, the credentials, the licence
 * line, the whole bio and all eleven specialty pills — over 400 characters,
 * read out on every Tab and shown as one unbroken run in a screen reader's
 * links list, with no separators between the pills. It passed SC 2.4.4 and
 * 2.5.3 on a technicality and was miserable to listen to. An aria-label was the
 * other option and is worse: it would duplicate 400 characters of clinical copy
 * that then drifts from what is on screen.
 *
 * With the stretched link the name is "Funmilayo Whitaker" and the bio and
 * pills are ordinary text a screen-reader user browses rather than has recited
 * at them. The focus ring moves to the card with `has-[a:focus-visible]`, so the
 * visible affordance still matches the hit area.
 *
 * The portrait is alt="" because the name is read immediately after it; a
 * descriptive alt would have the name and credentials announced twice.
 */

const MAX_TILT = 4;

export type ProviderCardData = {
  slug: string;
  name: string;
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

          {/* ONLY THE NAME IS THE LINK. after:absolute after:inset-0 stretches
              its hit area over the whole card, so the target and the tab stop
              are unchanged while the accessible name is just "Funmilayo
              Whitaker" instead of the card's entire contents. */}
          <h2 className="text-h3 text-np-ink mt-5">
            <Link
              href={`/providers/${provider.slug}`}
              className="rounded after:absolute after:inset-0 focus-visible:outline-none"
            >
              {provider.name}
            </Link>
          </h2>

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
        </div>
      </motion.div>
    </div>
  );
}
