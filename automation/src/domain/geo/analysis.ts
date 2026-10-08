/**
 * Reading one engine answer (docs/automation-architecture.md §5.6 geo_runs):
 * was Newpoint mentioned, was its site cited, which other providers appeared.
 * Pure and deterministic; the competitor names come from an extraction call,
 * and this only cleans them.
 */

export const NEWPOINT_HOST = "newpointnp.com";
/** geo_runs.answer_excerpt keeps the start of the answer, enough to see the context. */
export const EXCERPT_LENGTH = 2_000;
export const MAX_COMPETITORS = 25;

/** The practice's own name in its spellings (the live site uses four; CLAUDE.md). */
const NEWPOINT = /\bnew\s?point\s+health\s?care\b|\bnewpoint\b|newpointnp\.com/i;

export function mentionsNewpoint(text: string): boolean {
  return NEWPOINT.test(text);
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function citesNewpoint(urls: readonly string[]): boolean {
  return urls.some((url) => {
    const host = hostOf(url);
    return host === NEWPOINT_HOST || (host?.endsWith(`.${NEWPOINT_HOST}`) ?? false);
  });
}

/**
 * A provider name as a name: letters (any script), digits, spaces and the
 * punctuation names use. Anything else (a URL, an instruction, markup) is not
 * a name, and it would travel into the recommendations prompt (§5.6).
 */
const NAME = /^[\p{L}\p{N}][\p{L}\p{N} .,'&()-]*$/u;
const URLISH = /https?:|www\.|\.(com|org|net|io|health)\b|@/i;
export const MAX_NAME_LENGTH = 80;

export function cleanCompetitors(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = raw.trim().replace(/\s+/g, " ");
    const key = name.toLowerCase();
    if (name === "" || name.length > MAX_NAME_LENGTH || !NAME.test(name) || URLISH.test(name)) continue;
    if (mentionsNewpoint(name) || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result.slice(0, MAX_COMPETITORS);
}

export function excerpt(text: string): string {
  return text.length <= EXCERPT_LENGTH ? text : `${text.slice(0, EXCERPT_LENGTH - 1)}…`;
}
