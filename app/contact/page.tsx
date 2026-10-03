import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { PageHero } from '@/components/PageHero';
import { Mail, MapPin, Phone } from 'lucide-react';
import { ContactCrisis } from '@/components/sections/ContactCrisis';
import { PageFaq } from '@/components/sections/PageFaq';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { BUSINESS, CONTACT_PAGE, FAQ, PROVIDERS } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { breadcrumbSchema, contactPageSchema, faqSchema, organizationRef } from '@/lib/schema';

/**
 * /contact.
 *
 * The live site had a real Contact page at this exact path, carrying priority
 * 1.0 in its sitemap. The rebuild previously 301'd it to a homepage fragment,
 * which worked for a human but left the most-searched page type for a clinical
 * practice with no destination of its own. This restores it.
 *
 * No form with a backend: the appointment request goes to the existing form in
 * the homepage's contact section, so there is exactly one submission path on
 * the site. Everything else here is a `tel:` or `mailto:` link.
 *
 * CLIENT: no hours, no street address, and no practice-wide inbox appear on
 * this page, because none of the three is confirmed anywhere in /research.
 */
export const metadata = pageMetadata({
  title: CONTACT_PAGE.metaTitle,
  description: CONTACT_PAGE.metaDescription,
  path: '/contact',
});

/**
 * The hero photograph.
 *
 * Described rather than decorative, and written off the frame: a man on the
 * phone is what this page is for, which is the one case where the picture says
 * something the H1 does not.
 *
 * NO objectPosition. At 1440 and 1024 the box is wider than the master's
 * 1.79:1, so object-cover scales by width, the horizontal overflow is 0 and X
 * would be inert; the default vertical centre keeps him and the table in frame.
 */
const HERO_IMAGE = {
  src: '/images/contact/contact-hero-2400.webp',
  alt: 'A man sitting at a wooden table at home, smiling as he speaks on the phone, an open notebook in front of him, with a fiddle-leaf fig and a low shelf of books beside him.',
  /* 100vw describes the BOX; below lg object-cover scales by height and draws
     the image wider than the viewport. 1024 rather than the measured maximum,
     for the reason the other heroes record: it lands a DPR 2 device on the
     2048 candidate instead of the 3840 one. */
  sizes: '(min-width: 1024px) 100vw, 1024px',
  /* 82, as on every downscaled master here — the resampling dominates, not the
     encoder setting. */
  quality: 82,
};

export default function ContactPage() {
  /** Schema only — the visible breadcrumb was removed from PageHero. */
  const crumbs = [{ name: 'Contact', path: '/contact' }];

  return (
    <>
      {/* THE FAQPage NODE MOVED HERE WITH THE QUESTIONS, and it still exists
          exactly once on the site. It lived on /faq, which lived there because
          two pages emitting the same eight questions are two documents
          competing for one rich result. /faq is gone, so this is now the only
          URL carrying the full set — the homepage keeps its four-question
          preview and still emits no faqSchema. */}
      <JsonLd
        schemas={[
          organizationRef(),
          contactPageSchema(),
          faqSchema(FAQ.groups),
          breadcrumbSchema(crumbs),
        ]}
      />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        {/* NO HERO CTA ON THIS PAGE, and it came off with the CTA retarget.
            CTA.href is `/contact` now, so the hero button linked to the page it
            was already on — a no-op for a pointer user and a focus stop that
            goes nowhere for a keyboard one. The form is the next section, so
            there is nothing for it to do that the page does not already do. */}
        <PageHero
          title={CONTACT_PAGE.title}
          intro={CONTACT_PAGE.intro}
          image={HERO_IMAGE}
          /* Centred between the navbar and the hero's foot; `center` centres on
             the area BELOW the nav, not on the header box, because the header
             pulls itself up by --nav-h so the photograph runs behind the bar. */
          align="center"
          /* Centred from lg, left-aligned below — the service, provider,
             insurance and new-patient heroes all read this way. */
          copyAlign="center"
          /**
           * scrim="hero" with copyAlign="center", unchanged from the other
           * photographic heroes.
           *
           * NO STRONG EDGE UNDER THE HEADLINE. Sampling mean |dI/dx| down each
           * column of the master, the largest steps are x 94.5% (the shelf
           * upright at the right edge), x 2.9% (the curtain at the left) and
           * x 24.5% / 18.6% (the fig and the book stack). Between x 30% and
           * x 65% the frame is flat wall — the quietest part of the picture,
           * and where a centred heading lands.
           *
           * Restricting the sample to the rows the headline occupies, the four
           * strongest columns are 94.5%, 86.8%, 79.7% and 2.9%, landing at css
           * x 1361 / 1250 / 1148 / 42 at 1440 and 967 / 889 / 816 / 30 at
           * 1024, against headlines that run 421-1020 and 247-777. All clear.
           *
           * BELOW lg THE CROP IS A CENTRED WINDOW — 24.2%-75.8% of the source
           * at 390 — so every one of those is cropped out. The strongest edge
           * left inside that window measures 7.14 against 49.5 for the frame's
           * strongest, and it falls at css x 22, under the first character of
           * a left-aligned heading. A seventh of the frame's strongest edge,
           * at the very edge of the glyph run: visible on inspection, not a
           * seam. The AA figures below are measured with it there.
           *
           * GLYPH-CORE CONTRAST, white text, worst backdrop pixel under a
           * glyph, measured on the rendered page:
           *
           *   1440  h1 3.68:1 PASS (floor 3)   intro 4.31:1 (floor 4.5)
           *   1024  h1 3.69:1 PASS             intro 4.50:1, ON the floor
           *    390  h1 4.80:1 PASS             intro 5.42:1 PASS
           *    320  h1 4.38:1 PASS             intro 5.08:1 PASS
           *
           * THE HEADING PASSES EVERYWHERE; THE INTRO MISSES AT 1440 AND SITS
           * EXACTLY ON THE FLOOR AT 1024. Treat 4.50 as failing rather than
           * passing: it is one rounding step from 4.49, and nothing about the
           * crop guarantees which side of it a re-encode lands on.
           *
           * NOT FIXED HERE, AND THIS IS THE THIRD PAGE WITH THE SAME RESULT.
           * /insurance (4.25 / 4.29) and /new-patients (4.07 / 4.07) record it
           * too. The overlay was specified as the service pages', so retuning
           * it is out of scope; the crop cannot reach it either — sweeping
           * objectPosition Y across 0/25/50/75/100% moves the intro only
           * between 4.31:1 and 4.41:1 at 1440. The measured minimum is +0.04
           * flat alpha over the frame, the `hero` scrim's 0.10 tint to 0.14,
           * which puts it at 4.50:1 and 4.60:1 at +0.06. This frame needs the
           * least of the three because its wall is in shadow rather than lit.
           *
           * ONE SCRIM VARIANT WOULD CLOSE ALL THREE PAGES: +0.11 is what
           * /new-patients needs, and it clears this one and /insurance with
           * room. That is a new overlay value and needs asking for.
           */
          scrim="hero"
          showCta={false}
        />

        {/* THE FORM, AND IT LEADS THE PAGE NOW.
            Every "Request an appointment" on the site points at /contact, so
            the form is this page's primary purpose rather than a thing it
            refers to elsewhere. It is the same <ContactCrisis /> the homepage
            renders — same component, same fields, same HIPAA scope, nothing
            forked — so the two cannot drift.

            IT CARRIES THE PAGE'S CRISIS GUIDANCE. ContactCrisis includes
            <CrisisPanel /> in its right column, sticky for the length of the
            form and order-first below md, which is why the standalone sticky
            panel that used to sit in the contact-methods grid below is gone:
            two identical "If you need help now" panels on one page is a defect,
            not redundancy. Putting the form first is what keeps the remaining
            one high — higher than the old placement, not lower. */}
        <ContactCrisis />

        {/* THE FAQ, MERGED IN FROM /faq ON 2026-10-01 at the client's
            instruction. That page is gone and 301s to this anchor; its content
            is here unchanged — every group, every question, every answer,
            verbatim and in source order, one block per group under its own h2,
            exactly as it rendered there.

            id="faq" IS A LINK TARGET WITH TRAFFIC BEHIND IT. The homepage
            preview, the footer and the /faq redirect all land on it, so it has
            to stay on an element that exists whatever the groups are.
            globals.css's scroll-padding-top clears the sticky navbar.

            BETWEEN THE FORM AND THE CONTACT METHODS, as asked. The order is
            the page's argument: the form is what most people came to do, the
            FAQ answers what stops them doing it, and the phone and email
            details are for the people the first two did not finish.

            EACH GROUP STILL GETS A DISTINCT idPrefix. Accordion builds element
            ids from it, so two blocks sharing a prefix emit duplicate ids and
            cross-wire their aria-controls — the reason /faq passed one per
            group, and the reason this page cannot simply flatten them. */}
        <div id="faq">
          {FAQ.groups.map((group) => (
            <PageFaq
              key={group.title}
              heading={group.title}
              items={group.items}
              idPrefix={`faq-${group.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            />
          ))}
        </div>

        {/* WAYS TO REACH US — REBUILT 2026-10-01, and the shape is the point.
            What was here was four stacked sections, each a full-width h2 with
            a rule above it: "Request an appointment", "Call us", "Email a
            provider", "Where we see patients". Four headings, one per screen,
            for three facts and a sentence. Three things changed:

            ONE SECTION, THREE COLUMNS, HAIRLINE RULES. The three ways to reach
            the practice are siblings, not a sequence, so they read side by side
            at lg and stack below it. They are NOT cards: a card implies a
            boundary around something self-contained, and these are three
            columns of one answer. `divide-*` draws the same np-neutral-200
            hairline the rest of the page uses, with no surface, no shadow and
            no radius — the flattest thing that still separates.

            THE "Request an appointment" HEADING IS GONE. It sat above a call
            button and an anchor back to the form, so a heading-navigation user
            who jumped to it landed on neither the form nor an appointment.
            a11y-architect flagged exactly that. Its sentence survives verbatim
            as the Call column's lead, where it is true and where the number it
            refers to is next to it.

            NO NEW COPY. Every string here was already on this page or in
            CONTACT_PAGE: the three h3s, the call sentence, phoneNote,
            emailNote, areaNote, the numbers and the addresses. The one new
            string is the section heading, which the client wrote in the brief
            and which claims nothing.

            HOURS: THERE ARE NONE TO PUBLISH. The brief asked for hours in this
            section. No clock hours exist in any source — OPEN_CLIENT_ITEMS has
            carried the gap since the first audit — so none are invented. What
            the practice HAS published about when it is available is the
            "expanded schedule including weekends, evenings, and holidays by
            request" inside areaNote, which is why that sentence leads the third
            column rather than sitting last. */}
        <section aria-labelledby="reach-heading" className="py-20 md:py-28">
          <Container>
            <Reveal>
              <h2 id="reach-heading" className="text-h2 max-w-[20ch]">
                Ways to reach us
              </h2>
            </Reveal>
            {/* THE SECTION'S LEAD, AND IT IS HERE RATHER THAN IN THE CALL
                COLUMN FOR A CLINICAL REASON. healthcare-reviewer caught it:
                inside a column whose only contents are three phone numbers,
                "keep health information out of any message you send" reads as
                "do not discuss your symptoms when you call" — which is wrong,
                and which the sentence's own second half contradicts. A phone
                call is not a message, and it is the channel clinical detail is
                SUPPOSED to travel over.

                The sentence is unchanged. It introduces all three columns,
                which is what it did before the redesign, when it led the block
                that sat above every contact method on the page. The two
                channel-specific prohibitions are untouched and stay where they
                belong: emailNote above the mailto: links, and the form's own
                privacyNote directly above Send. */}
            <Reveal delay={0.08}>
              <p className="text-body-l text-np-neutral-600 mt-4 max-w-[62ch]">
                Calling is the fastest way to reach us. Please keep health information out of any
                message you send — tell us how to reach you and we will take the clinical details
                directly.
              </p>
            </Reveal>

            {/* divide-y below lg, divide-x at lg. The gap-less grid is
                deliberate: the rules do the separating, and a gap would leave
                the hairline floating away from both columns. Padding carries
                the breathing room instead. */}
            <div className="border-np-neutral-200 divide-np-neutral-200 mt-12 grid divide-y border-t lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              {/* CALL. First column because it is the fastest route and the
                  only one that reaches a person in a minute. */}
              <Reveal className="py-10 lg:py-12 lg:pr-10">
                <Phone
                  aria-hidden="true"
                  size={20}
                  strokeWidth={1.75}
                  className="text-np-blue-600"
                />
                <h3 className="text-h3 text-np-ink mt-4">Call us</h3>
                <p className="text-body text-np-neutral-600 mt-3 max-w-[46ch]">
                  {CONTACT_PAGE.phoneNote}
                </p>
                <ul role="list" className="mt-6 space-y-3">
                  <li>
                    <a
                      href={`tel:${BUSINESS.phonePrimaryHref}`}
                      className="font-display text-h3 text-np-blue-600 ease-np-out underline-offset-4 transition-colors duration-[180ms] hover:underline"
                    >
                      {BUSINESS.phonePrimary}
                    </a>
                  </li>
                  {BUSINESS.phoneAlt.map((phone) => (
                    <li key={phone}>
                      <a
                        href={`tel:+1${phone.replace(/\D/g, '')}`}
                        className="text-body text-np-blue-600 font-medium underline-offset-4 hover:underline"
                      >
                        {phone}
                      </a>
                    </li>
                  ))}
                  <li className="text-small text-np-neutral-600 pt-1">Fax {BUSINESS.fax}</li>
                </ul>
                {/* THE ROUTE BACK TO THE FORM, restored verbatim. It was the
                    second half of the "Request an appointment" block this
                    section replaced, and both reviews asked for it back: a
                    column that opens "calling is the fastest way" offers
                    nothing to a Deaf, hard-of-hearing or speech-disabled
                    reader, and the page's only other action by this point is
                    an email channel the next column says to keep clinical
                    detail out of. `#contact` is ContactCrisis's own section id
                    and globals.css's scroll-padding-top clears the navbar.

                    NOT the heading that was removed: that was an h2 reading
                    "Request an appointment" above a call button, which sent a
                    heading-navigation user somewhere that was neither the form
                    nor an appointment. This is a link that goes where it says. */}
                <p className="mt-6">
                  <a
                    href="#contact"
                    className="text-body text-np-blue-600 font-medium underline-offset-4 hover:underline"
                  >
                    Or send the appointment form
                  </a>
                </p>
                {/* CLIENT: hours of operation are not published anywhere, so no
                    "we answer between" line is claimed here. */}
              </Reveal>

              {/* EMAIL. */}
              <Reveal delay={0.08} className="py-10 lg:px-10 lg:py-12">
                <Mail
                  aria-hidden="true"
                  size={20}
                  strokeWidth={1.75}
                  className="text-np-blue-600"
                />
                <h3 className="text-h3 text-np-ink mt-4">Email a provider</h3>
                <p className="text-body text-np-neutral-600 mt-3 max-w-[46ch]">
                  {CONTACT_PAGE.emailNote}
                </p>
                <ul role="list" className="mt-6 space-y-4">
                  {PROVIDERS.map((p) => (
                    <li key={p.slug}>
                      <a
                        href={`mailto:${p.email}`}
                        className="text-body text-np-blue-600 font-medium underline-offset-4 hover:underline"
                      >
                        {p.email}
                      </a>
                      {/* The name UNDER the address, not the other way round:
                          an address on its own tells a patient nothing about
                          who reads it. `displayName` with the credentials
                          beside it, which is the adjacency CLAUDE.md requires
                          wherever "Dr." renders. */}
                      <p className="text-small text-np-neutral-600 mt-1">
                        {p.displayName}, {p.credentials}
                      </p>
                    </li>
                  ))}
                </ul>
                {/* CLIENT: no practice-wide inbox (info@ / contact@) exists, so
                    the two named provider addresses are listed instead. */}
              </Reveal>

              {/* WHEN AND WHERE. Telehealth, in-person, and the only thing the
                  practice has published about its schedule — all inside
                  areaNote, verbatim. */}
              <Reveal delay={0.16} className="py-10 lg:py-12 lg:pl-10">
                <MapPin
                  aria-hidden="true"
                  size={20}
                  strokeWidth={1.75}
                  className="text-np-blue-600"
                />
                <h3 className="text-h3 text-np-ink mt-4">Where we see patients</h3>
                <p className="text-body text-np-neutral-600 mt-3 max-w-[46ch]">
                  {CONTACT_PAGE.areaNote}
                </p>
                {/* THE CHIPS ARE UNLABELLED AGAIN, AND THAT IS NOW THE
                    CORRECT STATE. They carried a "Telehealth" scope label from
                    2026-10-01, added as a healthcare-reviewer High: with the
                    old areaNote binding the two states to telehealth and
                    in-person to neither, two bare state names under a map pin
                    and "Where we see patients" scanned as two places you could
                    be seen in person — which the care-modality rule forbade
                    inferring.

                    The client superseded that rule on 2026-10-02 and rewrote
                    areaNote above to say both modes across both states. The
                    label was scoping the chips to one mode, so it now
                    contradicts the sentence directly above it; the scan path
                    it protected is the reading the practice has confirmed.

                    aria-label replaces the visible label, so the list still
                    has a name for a screen reader without re-scoping it. */}
                <ul
                  role="list"
                  aria-label="States served"
                  className="mt-6 flex flex-wrap gap-2.5"
                >
                  {BUSINESS.serviceArea.map((state) => (
                    <li
                      key={state}
                      /* border-transparent so the chip keeps a shape in
                         forced-colors mode, where a background is stripped and
                         a transparent border is painted. Without it these
                         become two bare words separated by a 10px gap. */
                      className="rounded-chip bg-np-blue-50 text-small text-np-blue-700 border border-transparent px-3 py-1.5"
                    >
                      {state}
                    </li>
                  ))}
                </ul>
                {/* CLIENT: no street address, suite or ZIP is confirmed anywhere,
                    so none is stated and no map is embedded. Add both here and in
                    lib/schema.ts together once the client supplies it. */}
              </Reveal>
            </div>
          </Container>
        </section>

        {/* NO "Keep reading" AND NO CLOSING CTA BAND.
            "Keep reading" came off at the client's instruction on 2026-10-01,
            as it has from every other page in turn; its four links are all in
            the navbar and the footer.

            PageCta went with it, and that one is this page's own logic rather
            than an instruction: its primary button is CTA.href, which is
            /contact — the page it would be sitting on. That is the same no-op
            self-link the hero note above records, and the reason the hero CTA
            came off. The phone action it also carried is in the Call column
            above, on a page whose first section is the form. The footer's
            988 / 911 strip is unchanged. */}
      </main>
      <Footer />
    </>
  );
}
