import { describe, expect, it } from "vitest";
import {
  applyClustering,
  deriveBacklog,
  MAX_CANDIDATES,
  mergeCandidates,
  type Candidate,
  type Clustering,
} from "../../src/domain/seo/keyword-plan.js";
import { matchSnapshots, researchWindow, trackingWindow } from "../../src/domain/seo/rank-snapshots.js";
import { buildSeedMatrix } from "../../src/domain/seo/seed-matrix.js";
import { publicText, type PublicText } from "../../src/lib/phi.js";

const gsc = (query: string): PublicText => query as PublicText;

describe("seed matrix", () => {
  const seeds = buildSeedMatrix();
  const terms = seeds.map((seed) => seed.term);

  it("uses the owners' vocabulary and keeps 'psychiatric evaluation' as a tracked query", () => {
    expect(terms).toContain("psychiatric assessment lawrence township nj");
    expect(terms).toContain("mental and behavioral care new jersey");
    expect(terms).toContain("psychiatric evaluation pennsylvania");
  });

  it("never seeds a clinician title the providers do not hold", () => {
    expect(terms.filter((term) => /\b(psychiatrist|physician|doctor|dr)\b/i.test(term))).toEqual([]);
  });

  it("seeds Pennsylvania at state level only: no PA town is confirmed", () => {
    expect(seeds.filter((seed) => seed.state === "PA" && seed.town !== null)).toEqual([]);
  });

  it("produces unique terms", () => {
    expect(new Set(terms).size).toBe(terms.length);
  });
});

describe("mergeCandidates", () => {
  const seeds = buildSeedMatrix();

  it("puts seeds first, attaches Search Console impressions, and dedupes case- and space-insensitively", () => {
    const merged = mergeCandidates(seeds, [
      { query: gsc("Psychiatric  Assessment Lawrence Township NJ"), impressions: 40 },
      { query: gsc("adhd evaluation near me"), impressions: 90 },
      { query: gsc("ADHD evaluation near me"), impressions: 10 },
    ]);
    expect(merged.slice(0, seeds.length).every((c) => c.source === "manual")).toBe(true);
    expect(merged.find((c) => c.term === "psychiatric assessment lawrence township nj")?.impressions).toBe(40);
    const adhd = merged.filter((c) => c.term.toLowerCase() === "adhd evaluation near me");
    expect(adhd).toHaveLength(1);
    expect(adhd[0]).toMatchObject({ source: "search_console", impressions: 100, serviceSlug: null, intent: null });
  });

  it("caps the candidate list, keeping the highest-impression queries", () => {
    const many = Array.from({ length: 1_000 }, (_, i) => ({ query: gsc(`query ${String(i)}`), impressions: i }));
    const merged = mergeCandidates(seeds, many);
    expect(merged).toHaveLength(MAX_CANDIDATES);
    expect(merged[seeds.length]?.term).toBe("query 999");
  });
});

const candidate = (term: string, overrides: Partial<Candidate> = {}): Candidate => ({
  term: gsc(term),
  source: "search_console",
  serviceSlug: null,
  state: null,
  town: null,
  intent: null,
  impressions: 0,
  ...overrides,
});

describe("applyClustering", () => {
  const candidates = [
    candidate("psychiatric assessment lawrence township nj", { source: "manual", serviceSlug: "psychiatric-evaluation", intent: "local" }),
    candidate("adhd evaluation near me", { impressions: 80 }),
    candidate("how long does a psychiatric assessment take", { impressions: 30 }),
  ];

  const assessment: Clustering["clusters"][number] = {
    name: "Psychiatric Assessment",
    intent: "commercial",
    service_slug: "psychiatric-evaluation",
    term_indexes: [0, 2],
  };
  const adhd: Clustering["clusters"][number] = { name: "adhd assessment", intent: "local", service_slug: null, term_indexes: [1] };
  const good: Clustering = { clusters: [assessment, adhd] };

  it("assigns clusters, keeps a seed's own service and intent, fills them for Search Console terms", () => {
    const outcome = applyClustering(candidates, good);
    expect(outcome.ok).toBe(true);
    expect(outcome.unclustered).toBe(0);
    expect(outcome.candidates[0]).toMatchObject({ cluster: "psychiatric assessment", serviceSlug: "psychiatric-evaluation", intent: "local" });
    expect(outcome.candidates[1]).toMatchObject({ cluster: "adhd assessment", serviceSlug: null, intent: "local" });
    expect(outcome.candidates[2]).toMatchObject({ serviceSlug: "psychiatric-evaluation", intent: "commercial" });
  });

  it("counts terms the model left out as unclustered, and never guesses for them", () => {
    const outcome = applyClustering(candidates, { clusters: [adhd] });
    expect(outcome.ok).toBe(true);
    expect(outcome.unclustered).toBe(2);
    expect(outcome.candidates[0]?.cluster).toBeNull();
  });

  it.each([
    ["an index out of range", { clusters: [{ ...assessment, term_indexes: [3] }] }],
    ["a negative index", { clusters: [{ ...assessment, term_indexes: [-1] }] }],
    ["a term in two clusters", { clusters: [assessment, { ...adhd, term_indexes: [0] }] }],
    ["an empty name", { clusters: [{ ...assessment, name: "  " }] }],
    ["an overlong name", { clusters: [{ ...assessment, name: "x".repeat(81) }] }],
  ])("rejects the whole answer on %s", (_label, clustering) => {
    const outcome = applyClustering(candidates, clustering);
    expect(outcome.ok).toBe(false);
    expect(outcome.unclustered).toBe(candidates.length);
    expect(outcome.candidates.every((c) => c.cluster === null)).toBe(true);
  });

  it("does not store a label that breaks a content rule; its terms stay unclustered", () => {
    const outcome = applyClustering(candidates, { clusters: [{ ...adhd, name: "adhd psychiatrist near me" }] });
    expect(outcome.ok).toBe(true);
    expect(outcome.candidates[1]?.cluster).toBeNull();
    expect(outcome.unclustered).toBe(3);
  });

  it("never credits a restricted query to a service page", () => {
    const withTitle = [candidate("best psychiatrist lawrenceville nj", { impressions: 50 })];
    const outcome = applyClustering(withTitle, {
      clusters: [{ ...assessment, name: "psychiatric assessment", term_indexes: [0] }],
    });
    expect(outcome.candidates[0]).toMatchObject({ cluster: "psychiatric assessment", serviceSlug: null });
  });

  it("treats no answer (refusal, truncation, invalid output) as all unclustered", () => {
    expect(applyClustering(candidates, null)).toMatchObject({ ok: false, unclustered: 3 });
  });
});

describe("deriveBacklog", () => {
  it("proposes FAQ candidates from question queries and page gaps from unmapped clusters with demand", () => {
    const items = deriveBacklog([
      { ...candidate("how long does a psychiatric assessment take", { impressions: 30 }), cluster: "assessment" },
      { ...candidate("is telehealth psychiatry covered", { impressions: 5 }), cluster: "telehealth" },
      { ...candidate("adhd evaluation near me", { impressions: 40 }), cluster: "adhd assessment" },
      { ...candidate("adult adhd testing nj", { impressions: 20 }), cluster: "adhd assessment" },
      { ...candidate("medication management nj", { impressions: 500, serviceSlug: "medication-management" }), cluster: "meds" },
      { ...candidate("what is a psychiatric assessment", { source: "manual", impressions: 99 }), cluster: null },
    ]);
    expect(items).toEqual([
      { kind: "page", target: "adhd assessment", rationale: expect.stringContaining("60 Search Console impressions") as unknown },
      { kind: "faq", target: "how long does a psychiatric assessment take", rationale: expect.stringContaining("30") as unknown },
    ]);
  });
});

describe("deriveBacklog with restricted wording", () => {
  it("keeps the FAQ candidate and attaches the rule a person must follow", () => {
    const [item] = deriveBacklog([
      { ...candidate("can newpoint prescribe adderall", { impressions: 25 }), cluster: null },
    ]);
    expect(item?.kind).toBe("faq");
    expect(item?.rationale).toContain("Restricted wording");
    expect(item?.rationale).toContain("CLAUDE.md: ADHD prescribing line");
  });
});

describe("matchSnapshots", () => {
  it("matches case-insensitively, merges split rows impression-weighted, and fans out duplicate terms", () => {
    const snapshots = matchSnapshots(
      [
        { id: "k1", term: "Medication Management NJ" },
        { id: "k2", term: "medication management nj" },
        { id: "k3", term: "never searched" },
      ],
      [
        { query: "medication management nj", date: "2026-09-28", position: 4, impressions: 30, clicks: 2 },
        { query: "MEDICATION MANAGEMENT NJ", date: "2026-09-28", position: 8, impressions: 10, clicks: 0 },
        { query: "unrelated", date: "2026-09-28", position: 1, impressions: 5, clicks: 1 },
      ],
    );
    expect(snapshots).toEqual([
      { keywordId: "k1", date: "2026-09-28", position: 5, impressions: 40, clicks: 2 },
      { keywordId: "k2", date: "2026-09-28", position: 5, impressions: 40, clicks: 2 },
    ]);
  });
});

describe("windows", () => {
  const now = new Date("2026-10-12T10:00:00Z");
  it("reads only settled Search Console days", () => {
    expect(trackingWindow(now)).toEqual({ startDate: "2026-10-03", endDate: "2026-10-09" });
    expect(researchWindow(now)).toEqual({ startDate: "2026-09-12", endDate: "2026-10-09" });
  });
});

// The seed matrix is built only from literal templates; a compile-time check that it stays that way.
export const seedTermIsPublic: PublicText = buildSeedMatrix()[0]?.term ?? publicText("none");
