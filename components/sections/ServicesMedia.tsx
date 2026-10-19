'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import styles from './FeaturedServices.module.css';

/**
 * Playback coordination for the services section's four looping videos.
 *
 * WCAG 2.2.2 Pause, Stop, Hide: content that moves automatically for more than
 * five seconds needs a mechanism to pause it. Four autoplaying loops need one
 * control, not four.
 *
 * NOTE ON THE SPEC: this control is INDEPENDENT. It was to match "the hero pause
 * control" and optionally share its sessionStorage preference, but no such
 * control exists — the hero video is autoplay/loop/muted with no pause
 * mechanism at all. There was nothing to match or share with, so this one owns
 * its own state and follows the site's existing button and focus conventions
 * instead. The hero's own missing control is a separate WCAG 2.2.2 gap.
 *
 * Videos also pause when scrolled out of view, which keeps four decoded streams
 * off the CPU on a page the user is reading rather than watching.
 */

type MediaState = {
  /** The user's explicit intent. Offscreen pausing never changes this. */
  playing: boolean;
  reducedMotion: boolean;
  toggle: () => void;
  register: (el: HTMLVideoElement | null) => void;
};

const Ctx = createContext<MediaState | null>(null);

export function ServicesMediaProvider({ children }: { children: ReactNode }) {
  /*
   * EVERY RENDER STARTS PAUSED, and the preference is read in an effect.
   *
   * This used to read prefers-reduced-motion in a lazy useState initialiser so
   * a reduced-motion visitor never saw a frame of motion. But the server has
   * no matchMedia, so it rendered `playing: true` (the pause icon) while a
   * reduced-motion client's first render had `playing: false` (the play icon),
   * and React threw a hydration mismatch on every such visit.
   *
   * Starting paused for everyone fixes that without giving the protection back:
   * <ServiceVideo> carries no `autoPlay` attribute, so nothing plays until the
   * effect below calls play(), and that only happens once this effect has
   * confirmed the visitor has NOT asked for reduced motion. The cost is that
   * everyone else sees the toggle switch from "Play video" to "Pause video" at
   * hydration, which is also the truthful label without scripting.
   */
  const [reducedMotion, setReducedMotion] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videos = useRef(new Set<HTMLVideoElement>());

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    // Motion-on is the default, but only once we know it is wanted.
    if (!mq.matches) setPlaying(true);
    const onChange = () => {
      setReducedMotion(mq.matches);
      if (mq.matches) setPlaying(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const register = useCallback((el: HTMLVideoElement | null) => {
    if (el) videos.current.add(el);
  }, []);

  /**
   * Drive every registered video from the single `playing` flag, and pause any
   * that leaves the viewport. `play()` rejects if the element is detached or
   * autoplay is refused; that is expected and not an error worth surfacing.
   */
  useEffect(() => {
    const els = Array.from(videos.current);

    if (!playing) {
      els.forEach((v) => v.pause());
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const v = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) void v.play().catch(() => {});
          else v.pause();
        });
      },
      { threshold: 0.15 }
    );

    els.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, [playing]);

  const toggle = useCallback(() => setPlaying((p) => !p), []);

  const value = useMemo(
    () => ({ playing, reducedMotion, toggle, register }),
    [playing, reducedMotion, toggle, register]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function useServicesMedia() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('ServicesMedia components must be used within ServicesMediaProvider');
  return ctx;
}

/**
 * One decorative video with its hover furniture.
 *
 * The video is aria-hidden and has no controls: it carries no information the
 * surrounding text does not already give, and the card's link is the only thing
 * here a keyboard user needs to reach.
 */
export function ServiceVideo({
  video,
  poster,
  className,
}: {
  video: string;
  poster: string;
  className: string;
}) {
  const { register } = useServicesMedia();

  return (
    <div className={`${className} ${styles.media}`}>
      {/* Decorative, muted and aria-hidden, so there is nothing to caption. */}
      {/* No `autoPlay` attribute at all.
          The server cannot know the visitor's motion preference, so any
          autoPlay in the server-rendered HTML starts the video before hydration
          can stop it — a real flash of motion for someone who asked for none.
          Playback is therefore always a client decision: the provider's effect
          starts the videos that are in view, and under reduced motion it never
          starts them. The poster is what shows until then. */}
      <video
        ref={register}
        loop
        muted
        playsInline
        poster={poster}
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src={video} type="video/mp4" />
      </video>

      <div className={styles.overlay} aria-hidden="true" />
      <div className={styles.plus} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.cornerTL}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.cornerTR}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.cornerBL}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.cornerBR}`} aria-hidden="true" />
    </div>
  );
}

/** Section-level pause/play for all four videos. */
export function ServicesPlayToggle() {
  const { playing, toggle } = useServicesMedia();

  return (
    <button type="button" onClick={toggle} className={styles.playToggle}>
      <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true" fill="currentColor">
        {playing ? (
          <>
            <rect x="0" y="0" width="4" height="14" rx="1" />
            <rect x="8" y="0" width="4" height="14" rx="1" />
          </>
        ) : (
          <path d="M0 0.8v12.4a.8.8 0 0 0 1.23.67l9.76-6.2a.8.8 0 0 0 0-1.34L1.23.13A.8.8 0 0 0 0 .8Z" />
        )}
      </svg>
      {playing ? 'Pause video' : 'Play video'}
    </button>
  );
}
