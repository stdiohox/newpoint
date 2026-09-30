import type { Provider } from '@/lib/content';

/**
 * Provider portrait.
 *
 * Shape is --radius-media (20px rounded rectangle). The arch mask is DEFERRED,
 * not chosen against: the supplied photographs have no headroom above the head,
 * which the arch needs to read. See design-synthesis.md Part 4.
 *
 * Assets are pre-processed at exactly 560 and 1120 (backgrounds replaced,
 * colour graded to match, cropped to a common face fraction), so a plain
 * <picture> is used rather than next/image. Re-optimising them would only
 * degrade work already done at a known, capped size.
 */
export function ProviderPortrait({
  provider,
  className = '',
  sizes = '(min-width: 768px) 240px, 160px',
  loading = 'lazy',
  alt,
}: {
  provider: Provider;
  className?: string;
  sizes?: string;
  /**
   * Overrides the portrait's own descriptive alt. Pass "" where the provider's
   * name already sits beside the image, as in the /services cards — otherwise a
   * screen reader hears the name, then the credentials, then the same name and
   * credentials again out of the alt.
   */
  alt?: string;
  /**
   * Lazy by default, which is right for the homepage grid well below the fold.
   * The provider page renders this as its first content and it is that route's
   * likely LCP element, so it passes 'eager'.
   */
  loading?: 'lazy' | 'eager';
}) {
  const { image } = provider;
  return (
    <picture>
      <source
        type="image/webp"
        srcSet={`${image.webp560} 560w, ${image.webp1120} 1120w`}
        sizes={sizes}
      />
      {/* Plain <img>: assets are pre-sized and pre-optimised, see note above. */}
      <img
        src={image.jpg560}
        srcSet={`${image.jpg560} 560w, ${image.jpg1120} 1120w`}
        sizes={sizes}
        alt={alt ?? image.alt}
        width={560}
        height={560}
        loading={loading}
        fetchPriority={loading === 'eager' ? 'high' : undefined}
        decoding="async"
        className={`rounded-media bg-np-neutral-50 object-cover ${className}`}
      />
    </picture>
  );
}
