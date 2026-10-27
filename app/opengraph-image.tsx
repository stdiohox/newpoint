import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { BUSINESS, CLOSING_PORTRAIT } from '@/lib/content';

/**
 * Social card: the preview WhatsApp, Facebook, LinkedIn and iMessage show when
 * the site is shared. It cascades to every route because it sits at the root.
 *
 * SINCE 2026-10-22 IT CARRIES THE PROVIDERS' PHOTOGRAPH, the one the client
 * supplied for the homepage's "Health is wealth." section. A face is what a
 * feed stops on, and for a two-provider practice the providers ARE the
 * product. Before that it was type on the brand ink, generated because the
 * live site's og:image was its logo JPEG letterboxed into a square.
 *
 * THE PHOTO IS READ FROM assets/og/, NOT public/. Satori does not decode WebP,
 * so the card uses a JPEG copy sized to the panel (600x658, cover-cropped to
 * 560x630 here). It is not a public asset and nothing else references it.
 *
 * NO "Dr." AND NO NAMES ON THE CARD. It is an image with no credentials beside
 * it in a feed, which is exactly the surface CLAUDE.md's title condition rules
 * out, and the alt below is metadata, where "Dr." is never allowed. The
 * service list was tried under the headline and dropped: at a size that fits
 * the 640px column it wrapped mid-name.
 */
export const alt = `The two nurse practitioners at ${BUSINESS.legalName}, standing back to back and smiling — mental and behavioral care in New Jersey and Pennsylvania`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const photo = await readFile(join(process.cwd(), 'assets/og/providers-together.jpg'));
  const photoSrc = `data:image/jpeg;base64,${photo.toString('base64')}`;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        /* The brand colour, the portrait's backdrop blue (client, 2026-10-27);
           --color-np-turquoise in app/globals.css. Hex rather than var(): Satori
           has no access to the stylesheet. */
        backgroundColor: '#435ba8',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          width: 640,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 56px 56px 72px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              backgroundColor: '#ffffff',
              marginRight: 14,
            }}
          />
          <div
            style={{ fontSize: 28, color: '#ffffff', fontWeight: 600, letterSpacing: '-0.01em' }}
          >
            {BUSINESS.shortName}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 64,
              lineHeight: 1.02,
              color: '#ffffff',
              fontWeight: 600,
              letterSpacing: '-0.035em',
            }}
          >
            {CLOSING_PORTRAIT.tag}
          </div>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.25,
              color: '#ffffff',
              marginTop: 22,
              letterSpacing: '-0.01em',
            }}
          >
            Mental and behavioral care across New Jersey and Pennsylvania
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            borderTop: '1px solid rgba(255,255,255,0.24)',
            paddingTop: 22,
            fontSize: 22,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          newpointnp.com
        </div>
      </div>

      <img
        src={photoSrc}
        width={560}
        height={630}
        alt=""
        style={{ width: 560, height: 630, objectFit: 'cover', objectPosition: '50% 20%' }}
      />
    </div>,
    size
  );
}
