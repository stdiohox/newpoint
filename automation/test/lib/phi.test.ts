import { describe, expect, it } from "vitest";
import { phi, publicText, type Phi, type PublicText } from "../../src/lib/phi.js";

describe("publicText", () => {
  it("renders a literal template with public values", () => {
    const clusters = publicText("{count} clusters", { count: 3 });
    expect(publicText("{label}: {n} new, active={on}", { label: clusters, n: 2, on: true })).toBe(
      "3 clusters: 2 new, active=true",
    );
  });

  it("renders a template with no slots and no values", () => {
    expect(publicText("keyword research complete")).toBe("keyword research complete");
  });
});

/**
 * Compile-time guarantees. Never executed; `npm run typecheck` fails if any
 * `@ts-expect-error` line below stops being an error.
 */
export function typeLevelGuarantees(
  runtimeString: string,
  patientName: Phi<string>,
  patientAge: Phi<number>,
  patientMinor: Phi<boolean>,
): void {
  const sink = (text: PublicText): number => text.length;

  // @ts-expect-error a plain string is not PublicText
  sink(runtimeString);

  // @ts-expect-error PHI is not PublicText
  sink(patientName);

  // @ts-expect-error a runtime string cannot be a template
  publicText(runtimeString);

  // @ts-expect-error a plain string cannot fill a slot
  publicText("hello {name}", { name: runtimeString });

  // @ts-expect-error PHI cannot fill a slot
  publicText("hello {name}", { name: patientName });

  // @ts-expect-error every slot must be filled
  publicText("{a} and {b}", { a: 1 });

  // @ts-expect-error PHI cannot be the template itself
  publicText(patientName);

  // @ts-expect-error a template literal over a runtime string is not a literal
  publicText(`Lead ${runtimeString}`);

  // @ts-expect-error a template literal over PHI is not a literal
  publicText(`Lead ${patientName}`);

  // @ts-expect-error a PHI number cannot fill a slot
  publicText("age {n}", { n: patientAge });

  // @ts-expect-error a PHI boolean cannot fill a slot
  publicText("minor {m}", { m: patientMinor });

  // @ts-expect-error a union containing a non-literal is rejected
  publicText(Math.random() > 0.5 ? "a" : runtimeString);

  sink(publicText("{n} rows", { n: 1 }));
  const marked: Phi<string> = phi("value");
  // @ts-expect-error PHI marked with phi() is still rejected by a public sink
  sink(marked);
}
