/** The site shows the consent wording; the intake handler stores this one. They must not drift. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CONSENT_WORDING } from "../../src/domain/consent/wording.js";
import { REASONS } from "../../edge/intake/handler.js";

const content = readFileSync(join(import.meta.dirname, "../../../lib/content.ts"), "utf8");

describe("site ↔ automation", () => {
  it("SMS_CONSENT in lib/content.ts matches CONSENT_WORDING word for word, version included", () => {
    const block = /export const SMS_CONSENT = \{\s*version: (\d+),\s*text:\s*'([^']*)',?\s*\} as const;/.exec(content);
    expect(block, "SMS_CONSENT not found in lib/content.ts").not.toBeNull();
    expect(Number(block?.[1])).toBe(CONSENT_WORDING.version);
    expect(block?.[2]).toBe(CONSENT_WORDING.smsTransactional);
  });

  it("the intake handler accepts exactly the site's four reasons", () => {
    const reasons = /reasons: \[\s*([\s\S]*?)\]/.exec(content.slice(content.indexOf("export const CONTACT")))?.[1] ?? "";
    const labels = [...reasons.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(labels).toEqual(Object.keys(REASONS));
  });
});
