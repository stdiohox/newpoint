/**
 * WCAG 2.2 SC 2.4.11 Focus Not Obscured (Minimum) — automated sweep.
 *
 * The site has a sticky/fixed navbar on every route. A sticky bar paints over
 * content without reserving space in flow, and the browser only scrolls a
 * focused element into view when it judges it outside the scrollport — not when
 * it is merely covered by a same-viewport fixed sibling. So Tab can land focus
 * on something the bar completely hides.
 *
 * This walks the real tab order on every route, at desktop and phone widths,
 * with the nav in both of its states, and reports any focused element whose
 * box ends up entirely behind the bar.
 *
 * NOT wired into the build: it needs a running server and a browser, and a
 * failure here is a design question, not a compile error.
 *
 *   npm run build && npx next start -p 4321
 *   node scripts/focus-sweep.mjs --base http://localhost:4321
 *
 * Exits 1 if any element is fully obscured.
 */
import { chromium } from 'playwright';

const baseArg = process.argv.indexOf('--base');
const BASE = baseArg > -1 ? process.argv[baseArg + 1] : 'http://localhost:4321';

const ROUTES = [
  '/',
  '/contact',
  '/services',
  '/services/psychiatric-evaluation',
  '/services/medication-management',
  '/services/telehealth',
  '/insurance',
  '/new-patients',
  '/providers/funmilayo-whitaker',
  '/providers/anastasia-ofoegbu',
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
];

/** Top of the page, and scrolled far enough that the hero nav has gone solid. */
const STATES = [
  { name: 'top', scrollY: 0 },
  { name: 'scrolled', scrollY: 2000 },
];

/** Tab presses per run. Generous enough to reach past the nav into page content. */
const MAX_TABS = 60;

/**
 * Measures whether the focused element is actually visible, in the page.
 *
 * Geometry alone is not the test. SC 2.4.11 asks whether author-created content
 * HIDES the focused element, which is a question about paint order, not about
 * whether two boxes overlap — an element can sit inside the bar's band and
 * still be perfectly visible if it stacks above it. So this samples real points
 * on the element and asks the document what is actually painted there.
 *
 * Returns null for anything that cannot be obscured by the bar: the bar's own
 * children, body/null, and zero-area elements.
 */
const probe = () => {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;

  const bar = document.querySelector('header');
  if (!bar) return null;
  if (bar.contains(el)) return null;

  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;

  const barStyle = getComputedStyle(bar);
  if (barStyle.position !== 'fixed' && barStyle.position !== 'sticky') return null;

  // Sample inside each LINE BOX, not the union bounding box. An inline link
  // that wraps has a bounding box spanning both lines, whose centre falls in the
  // gutter between them — a point the link does not occupy. Sampling that
  // reports the neighbouring text as an obscurer, which is noise, not a finding.
  const boxes = el.getClientRects().length ? Array.from(el.getClientRects()) : [r];

  let inView = 0;
  let covered = 0;
  let coveredBy = null;

  for (const box of boxes) {
    if (box.width === 0 || box.height === 0) continue;
    // Inset slightly so a 1px border or a rounded corner does not read as a miss.
    const xs = [0.15, 0.5, 0.85].map((f) => box.left + box.width * f);
    const ys = [0.25, 0.5, 0.75].map((f) => box.top + box.height * f);

    for (const x of xs) {
      for (const y of ys) {
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
        inView++;
        const top = document.elementFromPoint(x, y);
        if (!top) continue;
        const isSelf = top === el || el.contains(top) || top.contains(el);
        if (!isSelf) {
          covered++;
          if (!coveredBy) {
            coveredBy = bar.contains(top)
              ? 'sticky navbar'
              : (top.tagName || '').toLowerCase() +
                (top.className ? '.' + String(top.className).split(' ')[0] : '');
          }
        }
      }
    }
  }

  if (inView === 0) return null;

  const label = (
    el.getAttribute('aria-label') ||
    el.textContent ||
    el.getAttribute('href') ||
    el.tagName
  )
    .trim()
    .slice(0, 60);

  const b = bar.getBoundingClientRect();
  return {
    tag: el.tagName.toLowerCase(),
    label,
    href: el.getAttribute('href') || '',
    rect: { top: Math.round(r.top), bottom: Math.round(r.bottom) },
    bar: { top: Math.round(b.top), bottom: Math.round(b.bottom) },
    coveredBy,
    fullyObscured: covered === inView,
    partiallyObscured: covered > 0 && covered < inView,
  };
};

const failures = [];
const partials = [];
let checked = 0;

const browser = await chromium.launch();

for (const viewport of VIEWPORTS) {
  for (const route of ROUTES) {
    for (const state of STATES) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
        reducedMotion: 'reduce', // deterministic: no in-flight scroll animations
      });

      await page.goto(BASE + route, { waitUntil: 'networkidle' });
      await page.evaluate((y) => window.scrollTo(0, y), state.scrollY);
      await page.waitForTimeout(250);

      await page.evaluate(() => document.body.focus());

      const seen = new Set();
      for (let i = 0; i < MAX_TABS; i++) {
        await page.keyboard.press('Tab');
        const result = await page.evaluate(probe);
        if (!result) continue;

        const key = `${result.tag}|${result.label}|${result.href}`;
        if (seen.has(key)) break; // wrapped around the tab order
        seen.add(key);
        checked++;

        const where = { route, viewport: viewport.name, state: state.name, ...result };
        if (result.fullyObscured) failures.push(where);
        else if (result.partiallyObscured) partials.push(where);
      }

      await page.close();
    }
  }
}

await browser.close();

const line = (f) =>
  `  ${f.route} [${f.viewport}/${f.state}]  <${f.tag}> "${f.label}"  ` +
  `el ${f.rect.top}-${f.rect.bottom}  bar ${f.bar.top}-${f.bar.bottom}` +
  (f.coveredBy ? `  covered by ${f.coveredBy}` : '');

console.log(
  `\nSC 2.4.11 Focus Not Obscured — swept ${ROUTES.length} routes ` +
    `x ${VIEWPORTS.length} widths x ${STATES.length} nav states`
);
console.log(`Focusable elements measured: ${checked}\n`);

if (partials.length) {
  console.log(`PARTIALLY obscured (not an SC 2.4.11 Minimum failure): ${partials.length}`);
  partials.forEach((f) => console.log(line(f)));
  console.log('');
}

if (failures.length === 0) {
  console.log('FULLY obscured: 0 — PASS');
  process.exit(0);
}

console.log(`FULLY obscured: ${failures.length} — FAIL`);
failures.forEach((f) => console.log(line(f)));
process.exit(1);
