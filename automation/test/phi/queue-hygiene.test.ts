/**
 * Queue hygiene (docs/automation-architecture.md §6 layer 4): PHI task payloads are
 * ids and enums only.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { PHI_PAYLOADS } from "../../src/trigger/phi/payloads.js";

/** Contact attributes and content. A field whose name contains one of these fails. */
const CONTACT_ATTRIBUTE =
  /(phone|name|email|address|dob|birth|body|text|message(?!id)|transcript|note|reason|symptom|diagnos|medication|insurance|ssn|state|zip|age|date|time(?!out))/i;

function fieldsOf(schema: z.ZodType): [string, z.ZodType][] {
  if (!(schema instanceof z.ZodObject)) throw new Error("payloads must be z.object schemas");
  return Object.entries<z.ZodType>(schema.shape);
}

describe("PHI payload schemas carry ids and enums only", () => {
  const entries = Object.entries(PHI_PAYLOADS);

  it.each(entries)("%s has no contact-attribute field names", (_id, schema) => {
    const bad = fieldsOf(schema).map(([key]) => key).filter((key) => !/Id$/.test(key) && CONTACT_ATTRIBUTE.test(key));
    expect(bad).toEqual([]);
  });

  it.each(entries)("%s has no free-text string field (uuid or enum only)", (_id, schema) => {
    const free = fieldsOf(schema)
      .filter(([, field]) => field instanceof z.ZodString && !(field instanceof z.ZodUUID))
      .map(([key]) => key);
    expect(free).toEqual([]);
  });

  it.each(entries)("%s is strict (unknown keys are rejected, not carried)", (_id, schema) => {
    expect(schema.safeParse(validSample(schema)).success).toBe(true);
    expect(schema.safeParse({ ...validSample(schema), phone: "+16095550100" }).success).toBe(false);
  });

  it("every PHI task file takes its schema from the registry", () => {
    const root = join(import.meta.dirname, "../../src/trigger/phi");
    const files = readdirSync(root, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".ts"));
    for (const file of files) {
      const text = readFileSync(join(root, file), "utf8");
      if (!/phiTask\(/.test(text)) continue;
      expect(text, file).toMatch(/schema: (PHI_PAYLOADS\[|sendSmsPayload)/);
    }
  });
});

function validSample(schema: z.ZodType): Record<string, unknown> {
  const sample: Record<string, unknown> = {};
  for (const [key, field] of fieldsOf(schema)) {
    if (field instanceof z.ZodUUID) sample[key] = "00000000-0000-4000-8000-000000000000";
    else if (field instanceof z.ZodEnum) sample[key] = field.options[0];
    else if (field instanceof z.ZodNumber) sample[key] = 0;
  }
  return sample;
}
