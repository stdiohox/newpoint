/**
 * gbp.nap-audit (§5.2): monthly. The listing's name, phone, address and website
 * against public.practice_facts; each mismatch → a `nap` content_backlog item for
 * a person to fix by hand.
 *
 * **Blocked until D11 is confirmed** (legal name "Newpoint" vs "New Point",
 * street address, storefront vs service area). Two locks, both required:
 *   1. GBP_NAP_AUDIT_ENABLED is exactly "true" (unset by default);
 *   2. legal_name, street_address and phone are present and confirmed in
 *      public.practice_facts.
 * Until both hold it calls nothing and writes nothing. It never proposes an
 * address of its own: it reports what Google shows beside what was confirmed.
 */
import type { BusinessProfile } from "../../../adapters/google/business-profile.js";
import { getConfirmedFact, proposeBacklog, type Queryable } from "../../../lib/db-marketing.js";
import type { Logger } from "../../../lib/logger.js";
import { marketingSchedule } from "../../../lib/task.js";
import type { BacklogItem } from "../../../domain/backlog.js";
import { marketingRuntime } from "../runtime.js";
import { businessProfileFrom, gbpQueue } from "./sync.js";

export const D11_FACTS = ["legal_name", "street_address", "phone"] as const;

export interface NapAuditDeps {
  readonly db: Queryable;
  readonly gbp: () => BusinessProfile;
  readonly logger: Logger;
  readonly enabled: boolean;
}

const norm = (text: string | null): string => (text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const digits = (text: string | null): string => (text ?? "").replace(/\D/g, "").slice(-10);
const host = (url: string | null): string => {
  try {
    return new URL(url ?? "").hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export async function runGbpNapAudit(deps: NapAuditDeps): Promise<{ readonly status: string; readonly mismatches: number }> {
  if (!deps.enabled) {
    deps.logger.warn("gbp.nap_audit.blocked_d11", { flag: false });
    return { status: "blocked_d11", mismatches: 0 };
  }
  const legalName = await getConfirmedFact(deps.db, "legal_name");
  const address = await getConfirmedFact(deps.db, "street_address");
  const phone = await getConfirmedFact(deps.db, "phone");
  if (legalName === null || address === null || phone === null) {
    deps.logger.warn("gbp.nap_audit.blocked_d11", { flag: true });
    return { status: "blocked_d11_facts_unconfirmed", mismatches: 0 };
  }

  const listing = await deps.gbp().getLocation();
  const checks: { field: string; shown: string | null; confirmed: string; same: boolean }[] = [
    { field: "name", shown: listing.title, confirmed: legalName, same: norm(listing.title) === norm(legalName) },
    { field: "phone", shown: listing.primaryPhone, confirmed: phone, same: digits(listing.primaryPhone) === digits(phone) },
    { field: "address", shown: listing.address, confirmed: address, same: norm(listing.address) === norm(address) },
    { field: "website", shown: listing.websiteUri, confirmed: "https://newpointnp.com/", same: host(listing.websiteUri) === "newpointnp.com" },
  ];
  const items: BacklogItem[] = checks
    .filter((c) => !c.same)
    .map((c) => ({
      kind: "nap",
      target: `gbp listing ${c.field}`,
      rationale: `Google shows "${c.shown ?? "nothing"}"; the confirmed fact is "${c.confirmed}". Fix the listing by hand in Google Business Profile, or the fact if the listing is right. NAP must match the site exactly; never enter an address the client has not confirmed (D11).`,
    }));
  await proposeBacklog(deps.db, items, "gbp.nap-audit");
  deps.logger.info("gbp.nap_audit.completed", { mismatches: items.length });
  return { status: "audited", mismatches: items.length };
}

export const gbpNapAudit = marketingSchedule({
  id: "gbp.nap-audit",
  cron: { pattern: "0 9 5 * *", timezone: "America/New_York" },
  queue: gbpQueue,
  maxDuration: 120,
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 60_000, maxTimeoutInMs: 600_000 },
  run: () => {
    const runtime = marketingRuntime();
    return runGbpNapAudit({
      ...runtime,
      gbp: () => businessProfileFrom(runtime.env),
      enabled: runtime.env.GBP_NAP_AUDIT_ENABLED === "true",
    });
  },
});
