/** The public-zone crisis phrase list (reviews) must match the PHI-zone one (SMS, voice) word for word. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mentionsCrisis } from "../../src/domain/gbp/crisis-mention.js";

const block = (file: string): string => {
  const text = readFileSync(join(import.meta.dirname, "../../src/domain", file), "utf8");
  const start = text.indexOf("const PHRASES");
  return text.slice(start, text.indexOf("];", start) + 2);
};

describe("crisis mentions in reviews", () => {
  it("uses the same phrase list as the PHI-zone detector", () => {
    expect(block("gbp/crisis-mention.ts")).toBe(block("crisis/detect.ts"));
  });

  it("flags self-harm wording and not an ordinary complaint", () => {
    expect(mentionsCrisis("After the way I was treated I just want to end it all.")).toBe(true);
    expect(mentionsCrisis("Waited forty minutes and nobody told me why.")).toBe(false);
  });
});
