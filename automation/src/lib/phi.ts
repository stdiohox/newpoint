/**
 * The PHI type guard (docs/automation-architecture.md §0.5, §3).
 *
 * Two brands, and the only functions allowed to create them:
 *
 * - `Phi<T>` marks a value that identifies a person as a Newpoint patient,
 *   prospective patient or referral. Every column read from the `phi` schema is
 *   wrapped in it (Phase 5).
 * - `PublicText` is text that provably contains no PHI. Public-zone sinks — the
 *   public Anthropic client, the n8n emitter, the logger — accept only
 *   `PublicText`, so handing them a `Phi<string>` (or any plain `string`) is a
 *   compile error rather than a code-review catch.
 *
 * `PublicText` can only be built from a string *literal* template whose slots are
 * filled with other `PublicText` or with numbers/booleans. A runtime string — a
 * database value, a request body, a vendor error message — cannot become
 * `PublicText` without passing through a template written in source code.
 */

declare const phiBrand: unique symbol;
declare const publicBrand: unique symbol;

export type Phi<T> = T & { readonly [phiBrand]: true };
export type PublicText = string & { readonly [publicBrand]: true };

/** Values allowed in a `publicText` slot. Never a plain `string`. */
export type PublicValue = PublicText | number | boolean;

/**
 * `T` itself when it is a plain string literal (or a union of them), `never`
 * otherwise. Rejects `string`, template-literal patterns such as
 * `` `Lead ${string}` `` (what `` `Lead ${name}` `` infers to), and branded
 * strings such as `Phi<string>`: for all three, `Record<T, true>` is an index
 * signature that `{}` satisfies, while a literal key is required.
 */
type IsPlainLiteral<T extends string> = T extends unknown
  ? // The empty object type is the point: it satisfies an index signature, never a literal key.
    // eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type
    Record<never, never> extends Record<T, true>
    ? false
    : true
  : never;
export type LiteralOnly<T extends string> = false extends IsPlainLiteral<T> ? never : T;

/** `V` with every `Phi<…>` property turned into `never`, so passing one fails to compile. */
export type PhiFree<V> = {
  readonly [K in keyof V]: V[K] extends { readonly [phiBrand]: true } ? never : V[K];
};

/** `"Hello {name}, {count} new"` → `"name" | "count"`. */
export type TemplateSlots<T extends string> =
  T extends `${string}{${infer Slot}}${infer Rest}` ? Slot | TemplateSlots<Rest> : never;

type SlotValues<T extends string> = { readonly [K in TemplateSlots<T>]: PublicValue };

const SLOT = /\{([A-Za-z0-9_]+)\}/g;

/**
 * Builds `PublicText` from a literal template.
 *
 * @example publicText("{count} keywords clustered", { count: 42 })
 */
export function publicText<const T extends string, const V extends SlotValues<T> = SlotValues<T>>(
  template: T & LiteralOnly<T>,
  ...args: [TemplateSlots<T>] extends [never] ? [] : [values: V & PhiFree<V>]
): PublicText {
  const values: Readonly<Record<string, PublicValue>> = args[0] ?? {};
  const rendered = template.replace(SLOT, (_match, slot: string) => {
    const value = values[slot];
    if (value === undefined) {
      throw new TypeError(`publicText: missing value for slot "${slot}"`);
    }
    return String(value);
  });
  return rendered as PublicText;
}

/** Joins `PublicText` parts. The result is public because every part is. */
export function joinPublic(parts: readonly PublicText[], separator: PublicText): PublicText {
  return parts.join(separator) as PublicText;
}

/**
 * Runtime data from a source the plan places in the public zone (§2), which is
 * the one way a runtime string becomes `PublicText` without a template.
 *
 * This is a policy decision, not a proof. Search Console returns aggregated
 * queries for the public site and drops rare ("anonymized") ones, but a
 * frequent query can still contain a name. The plan places Search Console in
 * the public zone (§2), and nothing it returns identifies anyone as a patient:
 * a query is what someone searched, not a contact with the practice.
 *
 * eslint.config.mjs allows importing this only from PUBLIC_SOURCE_ADAPTERS:
 * every new caller is a new public source and needs the same argument made
 * there, in review.
 */
export type PublicSource =
  /** Search queries for the public site (Phase 1). */
  | "google_search_console"
  /** newpoint-marketing, which holds no patient identifiers by construction (§0.1, §4). */
  | "newpoint_marketing_db"
  /** An answer engine's reply to a GEO prompt, grounded in the public web (§5.6). */
  | "public_web_answer";

export function fromPublicSource(_source: PublicSource, value: string): PublicText {
  return value as PublicText;
}

/**
 * Marks a value as PHI. Used by the PHI-zone data layer only (Phase 5); the
 * public zone has no reason to call it, and nothing accepts `Phi<T>` there.
 */
export function phi<T>(value: T): Phi<T> {
  return value as Phi<T>;
}
