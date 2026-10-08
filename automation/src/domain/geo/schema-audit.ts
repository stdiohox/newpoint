/**
 * The site's schema.org markup, checked against the brief
 * (docs/automation-architecture.md §5.6; CLAUDE.md "Stack" and "Clinician
 * titles"). Produces schema backlog items for a person editing the site repo.
 *
 * Every piece of advice is written here, in source, so it cannot drift into
 * what the brief forbids. Present values the brief keeps open (an address, a
 * credential, an NPI) are flagged to confirm, not removed. It never recommends:
 *   - a Physician, IndividualPhysician or PhysiciansOffice type;
 *   - areaServed on a Person;
 *   - an address (the validator warning for MedicalClinic is accepted);
 *   - hasCredential or an NPI identifier (omitted until the client supplies them).
 */
import type { BacklogItem } from "../backlog.js";

export interface PageSchemaInput {
  readonly url: string;
  /** null = the page could not be read or its JSON-LD did not parse. */
  readonly blocks: readonly unknown[] | null;
}

interface SchemaNode {
  readonly types: readonly string[];
  readonly properties: ReadonlySet<string>;
  readonly record: Readonly<Record<string, unknown>>;
}

/** JSON-LD deeper than this is not real markup; the walk stops rather than overflowing. */
const MAX_DEPTH = 32;

const FORBIDDEN_TYPES = ["Physician", "IndividualPhysician", "PhysiciansOffice"];

/** Every object with an @type, at any depth, including @graph members. */
export function schemaNodes(blocks: readonly unknown[]): SchemaNode[] {
  const nodes: SchemaNode[] = [];
  const visit = (value: unknown, depth = 0): void => {
    if (depth > MAX_DEPTH) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        visit(item, depth + 1);
      });
      return;
    }
    if (typeof value !== "object" || value === null) return;
    const record = value as Record<string, unknown>;
    const type = record["@type"];
    const types = (Array.isArray(type) ? type : [type])
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.replace(/^https?:\/\/schema\.org\//, ""));
    if (types.length > 0) nodes.push({ types, properties: new Set(Object.keys(record)), record });
    Object.values(record).forEach((child) => {
      visit(child, depth + 1);
    });
  };
  blocks.forEach((block) => {
    visit(block);
  });
  return nodes;
}

const pathOf = (url: string): string => {
  try {
    return new URL(url).pathname.replace(/\/$/, "") || "/";
  } catch {
    return url;
  }
};

export interface SchemaAudit {
  readonly items: BacklogItem[];
  /** Pages that could not be read: their coverage is unknown, not missing. */
  readonly unreadable: number;
}

export function auditSchema(pages: readonly PageSchemaInput[]): SchemaAudit {
  const items: BacklogItem[] = [];
  const readable = pages.filter((page): page is PageSchemaInput & { blocks: readonly unknown[] } => page.blocks !== null);
  const all = readable.flatMap((page) => schemaNodes(page.blocks).map((node) => ({ page, node })));

  // Violations first: these are wrong now, not merely missing.
  for (const { page, node } of all) {
    for (const type of node.types.filter((t) => FORBIDDEN_TYPES.includes(t))) {
      items.push({
        kind: "schema",
        target: `remove ${type} from ${pathOf(page.url)}`,
        rationale: `Both providers are advanced practice nurses; NJ and PA protect physician titles. Use MedicalClinic for the practice and Person for each provider, never ${type} (CLAUDE.md: Clinician titles).`,
      });
    }
    if (node.types.includes("Person") && node.properties.has("areaServed")) {
      items.push({
        kind: "schema",
        target: `remove areaServed from Person on ${pathOf(page.url)}`,
        rationale: "areaServed is not valid on Person. Licensure geography goes on hasOccupation.occupationalLocation (CLAUDE.md: Stack, schema rules).",
      });
    }
    if (node.types.includes("Person") && node.properties.has("medicalSpecialty")) {
      items.push({
        kind: "schema",
        target: `remove medicalSpecialty from Person on ${pathOf(page.url)}`,
        rationale:
          "medicalSpecialty belongs on the clinic only. A provider's specialty is carried by jobTitle, hasOccupation and knowsAbout (CLAUDE.md: Stack, schema rules).",
      });
    }
    const name = node.record["name"];
    if (node.types.includes("Person") && typeof name === "string" && /^\s*dr\b/i.test(name)) {
      items.push({
        kind: "schema",
        target: `move the title out of Person.name on ${pathOf(page.url)}`,
        rationale:
          'Person.name stays the legal name; the title belongs in honorificPrefix: "Dr.", beside a jobTitle that states the nurse-practitioner role (CLAUDE.md: Clinician titles, override of 2026-10-01).',
      });
    }
    // Present values the brief says stay omitted until supplied: confirm, never remove blindly.
    if (node.types.includes("Person") && (node.properties.has("hasCredential") || node.properties.has("identifier"))) {
      items.push({
        kind: "schema",
        target: `confirm hasCredential and identifier on ${pathOf(page.url)}`,
        rationale:
          "Both stay omitted until the client supplies the certifying body and NPI numbers. If the client has not, remove them (CLAUDE.md: Stack, schema rules).",
      });
    }
    if (node.types.includes("MedicalClinic") && node.properties.has("address")) {
      items.push({
        kind: "schema",
        target: `confirm the MedicalClinic address on ${pathOf(page.url)}`,
        rationale:
          "The street address is an open client item. Keep it only if the client confirmed it; never synthesise one to satisfy the validator (CLAUDE.md: Stack, OPEN_CLIENT_ITEMS).",
      });
    }
  }

  // Gaps: only when the page that should carry the markup was actually read.
  const clinics = all.filter(({ node }) => node.types.includes("MedicalClinic"));
  if (readable.length > 0 && clinics.length === 0) {
    items.push({
      kind: "schema",
      target: "add MedicalClinic to every page",
      rationale:
        'The practice node: MedicalClinic with medicalSpecialty "Psychiatric", emitted in full on every page that references it (a bare @id stub does not resolve across documents). Leave address out until the client confirms it; accept the validator warning (CLAUDE.md: Stack).',
    });
  } else if (clinics.some(({ node }) => !node.properties.has("medicalSpecialty"))) {
    items.push({
      kind: "schema",
      target: "add medicalSpecialty to MedicalClinic",
      rationale: 'medicalSpecialty "Psychiatric" belongs on the clinic, and only on the clinic (CLAUDE.md: Stack, schema rules).',
    });
  }

  for (const page of readable.filter((p) => /^\/providers\/[^/]+$/.test(pathOf(p.url)))) {
    if (!schemaNodes(page.blocks).some((node) => node.types.includes("Person"))) {
      items.push({
        kind: "schema",
        target: `add Person to ${pathOf(page.url)}`,
        rationale:
          'Person with name = the legal name, jobTitle "Psychiatric-Mental Health Nurse Practitioner", hasOccupation, knowsAbout and worksFor the MedicalClinic; honorificSuffix copied from research/people-trust.md; any title only as honorificPrefix. No areaServed and no medicalSpecialty; hasCredential and identifier (NPI) stay omitted until supplied (CLAUDE.md: Stack, Clinician titles).',
      });
    }
  }

  const faq = readable.find((p) => pathOf(p.url) === "/faq");
  if (faq && !schemaNodes(faq.blocks).some((node) => node.types.includes("FAQPage"))) {
    items.push({
      kind: "schema",
      target: "add FAQPage to /faq",
      rationale:
        "Answer engines quote FAQPage answers verbatim. A provider named in an answer may carry Dr. only where the same string shows the credentials (DNP, FNP-BC, PMHNP-BC) or the words \"nurse practitioner\" (CLAUDE.md: Clinician titles).",
    });
  }

  return { items, unreadable: pages.length - readable.length };
}
