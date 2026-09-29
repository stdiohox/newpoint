import { ImageResponse } from 'next/og';
import { BUSINESS } from '@/lib/content';

/**
 * Social card, generated rather than supplied.
 *
 * The live site reuses its logo JPEG as the og:image on all three pages, which
 * renders as a small letterboxed square in every feed that shows it. This is a
 * real 1200x630 card, set in type on the brand ink, and it cascades to every
 * route in the app because it sits at the root.
 *
 * CLIENT: this is generated from the wordmark and brand colours, not from a
 * supplied asset. If the practice has photography or a designed card it would
 * rather use, drop it in as app/opengraph-image.jpg and delete this file.
 */
export const alt = `${BUSINESS.legalName} — mental and behavioral care in New Jersey and Pennsylvania`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#131c2e',
        padding: '72px 80px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 999,
            backgroundColor: '#3d62b8',
            marginRight: 16,
          }}
        />
        <div style={{ fontSize: 30, color: '#ffffff', fontWeight: 600, letterSpacing: '-0.01em' }}>
          {BUSINESS.shortName}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            // 60/1000, down from 68/900. The headline gained 11 characters when
            // it became "Mental and behavioral care across …", which wrapped to
            // three lines in the old measure and crowded the card. This holds it
            // at two, which is the composition the card was set for.
            fontSize: 60,
            lineHeight: 1.08,
            color: '#ffffff',
            fontWeight: 600,
            letterSpacing: '-0.03em',
            maxWidth: 1000,
          }}
        >
          Mental and behavioral care across New Jersey and Pennsylvania
        </div>
        <div style={{ fontSize: 30, color: '#8fb0ee', marginTop: 28, letterSpacing: '-0.01em' }}>
          Assessment. Medication management. Telehealth.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid rgba(255,255,255,0.16)',
          paddingTop: 28,
          fontSize: 24,
          color: 'rgba(255,255,255,0.65)',
        }}
      >
        <div>{BUSINESS.legalName}</div>
        <div>newpointnp.com</div>
      </div>
    </div>,
    size
  );
}
