#!/usr/bin/env node
/**
 * Fails if any component sets its own PAGE width instead of using the page
 * column (<Container> / the `page-col` utility, defined once in
 * app/globals.css). See "Page width — ONE COLUMN" in CLAUDE.md.
 *
 * Hand-written page widths are how three homepage sections ended up ~200px
 * wider a side than the rest of the page, and how the footer card ended up
 * wider than the navbar. This turns the rule into a check.
 *
 * Flagged: Tailwind's 5xl/6xl/7xl/screen max-widths, any max-w-[NNNNpx]
 * (four digits, i.e. page-scale), the old uncapped `px-6 md:px-12 lg:px-16`
 * gutters, and the bare `container` class. Text measures (max-w-[46ch],
 * max-w-3xl and smaller) are not page widths and stay allowed.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['app', 'components'];
const ALLOW = new Set(['components/ui/Container.tsx']);
const RULES = [
  [/\bmax-w-(?:5xl|6xl|7xl|screen(?:-[a-z0-9]+)?)\b/, 'Tailwind page-scale max-width'],
  [/\bmax-w-\[\d{4,}px\]/, 'hand-written page max-width'],
  [/px-6 md:px-12 lg:px-16/, 'old uncapped navbar gutters'],
  [/className=["'`][^"'`]*(?<![\w-])container(?![\w-])/, 'bare `container` class'],
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(tsx|ts|jsx|js)$/.test(name)) yield p;
  }
}

const hits = [];
for (const root of ROOTS) {
  for (const file of files(root)) {
    if (ALLOW.has(file)) continue;
    // Comments may describe the old values; only code counts. Blank them out
    // (keeping newlines, so line numbers still match the file).
    const code = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/(^|[^:'"`])\/\/.*$/gm, (m, pre) => pre + ' '.repeat(m.length - pre.length));
    code.split('\n').forEach((line, i) => {
      for (const [re, why] of RULES) if (re.test(line)) hits.push(`${file}:${i + 1}  ${why}\n    ${line.trim().slice(0, 140)}`);
    });
  }
}

if (hits.length) {
  console.error(
    `check-widths: ${hits.length} hand-written page width(s). Use <Container> (the page column) instead; ` +
      `to change the site's width, edit --page-max / --page-gutter in app/globals.css.\n\n` + hits.join('\n')
  );
  process.exit(1);
}
console.log('check-widths: every page width goes through the page column.');
