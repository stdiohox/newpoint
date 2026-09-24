import Link from 'next/link';
import { outfit, inter } from '@/app/fonts';
import { FEATURED_SERVICES, WHAT_WE_TREAT } from '@/lib/content';
import { ServicesMediaProvider, ServiceVideo, ServicesPlayToggle } from './ServicesMedia';
import styles from './FeaturedServices.module.css';

/**
 * Homepage services section.
 *
 * Keeps id="what-we-treat" so the nav anchor, the footer link and any external
 * link to /#what-we-treat all still land here.
 *
 * Server component. Only the videos and the pause control are client, wrapped
 * by ServicesMediaProvider — the headings, copy and links stay server-rendered
 * and in the static HTML, which is what the SEO brief requires.
 *
 * Outfit and Inter are scoped by class on the section wrapper, so the rest of
 * the site keeps Cabinet Grotesk + Switzer.
 *
 * The conditions field below the grid is carried over from the previous version
 * of this section deliberately. The new layout spec does not mention it, but it
 * is the homepage's only source of condition keywords (depression, anxiety,
 * PTSD and eight more) and the old component's own comment named it as carrying
 * the section's SEO weight for condition queries. Dropping it silently would
 * have been a measurable loss on a site whose brief makes SEO a core
 * deliverable. Easy to remove if it is not wanted.
 */
export function FeaturedServices() {
  const services = [...FEATURED_SERVICES].sort((a, b) => a.displayOrder - b.displayOrder);
  const featured = services.find((s) => s.type === 'featured');
  const cards = services.filter((s) => s.type === 'card');

  return (
    <section
      id="what-we-treat"
      className={`${styles.section} ${outfit.variable} ${inter.variable}`}
    >
      <ServicesMediaProvider>
        <header>
          <div className={styles.headerTop}>
            <span className={styles.badge}>Services</span>
            <ServicesPlayToggle />
          </div>

          <h2 className={styles.heading}>{WHAT_WE_TREAT.heading}</h2>

          <div className={styles.headerBottom}>
            <p className={styles.subtitle}>{WHAT_WE_TREAT.body}</p>
            <Link href="/services" className={styles.viewAll}>
              View all services
            </Link>
          </div>
        </header>

        {featured && (
          <article className={styles.featured}>
            <ServiceVideo
              video={featured.video}
              poster={featured.poster}
              className={styles.featuredMedia}
            />

            <div className={styles.featuredBody}>
              {featured.badge && <span className={styles.startPill}>{featured.badge}</span>}
              {/* The visible title IS the link text — there is no second,
                  screen-reader-only copy of it. An earlier version put an
                  sr-only title inside the anchor and the visible one beside it,
                  which gave the anchor the right name but made the h3's own text
                  the title TWICE. Heading navigation reads that h3 text, so
                  anyone jumping by heading heard it doubled. The card-wide hit
                  area now comes from .cardLink::after, not from stretching the
                  anchor itself. */}
              <h3 className={styles.featuredTitle}>
                <Link href={featured.href} className={styles.cardLink}>
                  {featured.title}
                </Link>
              </h3>
              <p className={styles.featuredDescription}>{featured.description}</p>

              <div className={styles.featuredFooter}>
                <span className={styles.footerText}>{featured.footerText}</span>
                <span className={styles.category} style={{ background: featured.categoryColor }}>
                  {featured.category}
                </span>
              </div>
            </div>
          </article>
        )}

        <div className={styles.grid}>
          {cards.map((service) => (
            <article key={service.href} className={styles.card}>
              <ServiceVideo
                video={service.video}
                poster={service.poster}
                className={styles.cardMedia}
              />

              <div className={styles.cardFooter}>
                <h3 className={styles.cardTitle}>
                  <Link href={service.href} className={styles.cardLink}>
                    {service.title}
                  </Link>
                </h3>
                <span className={styles.category} style={{ background: service.categoryColor }}>
                  {service.category}
                </span>
              </div>

              {/* The modality line renders here, not only on the featured card.
                  A disclosure that lives only in the content file is not a
                  disclosure — and the telehealth card in particular needs its
                  scope on the page, or it reads as unqualified. */}
              {service.footerText && <p className={styles.cardFooterText}>{service.footerText}</p>}
            </article>
          ))}
        </div>

        <div className={styles.conditions}>
          <h3 className={styles.conditionsHeading}>Conditions we treat</h3>
          <ul role="list" className={styles.conditionsList}>
            {WHAT_WE_TREAT.conditions.map((condition) => (
              <li key={condition} className={styles.condition}>
                {condition}
              </li>
            ))}
          </ul>
          {/* CLIENT: no therapy modality (CBT, DBT and similar) is named anywhere
              in the source material, and none is invented here.
              CLIENT: age range served is not stated as a practice policy. */}
        </div>
      </ServicesMediaProvider>
    </section>
  );
}
