/**
 * ops.crisis-page and its dead-man check (docs/automation-architecture.md §5.8, §5.9).
 *
 * A crisis_events row pages the on-call clinician directly, by Twilio SMS and voice
 * call, inside the PHI zone. n8n is not in this path. The page repeats every 10
 * minutes until a clinician acknowledges it in the staff console, and from 30 minutes
 * after detection the second provider is paged too. Pages carry no patient detail:
 * a fixed line and the console link.
 *
 * Each round is claimed on the row (paged_at, page_count) before Twilio is called, so
 * the task and the dead-man cron never page twice for one round. If every delivery in
 * a round fails, the claim is rolled back and the round fails, to be retried.
 *
 * The dead-man cron runs every minute. Any unacknowledged event not paged within 2
 * minutes of detection, or whose last page is over 12 minutes old (the repeating task
 * died), is paged from the cron itself, and Koret ops is paged once for that event.
 * Paging stops only on acknowledgment.
 */
import { wait } from "@trigger.dev/sdk";
import { pageText, withLink, type PageText, type Twilio } from "../../../adapters/messaging/twilio.js";
import type { PhiDb } from "../../../lib/db-phi.js";
import type { PhiEnv } from "../../../lib/env-phi.js";
import type { Logger } from "../../../lib/logger.js";
import { phiSchedule, phiTask } from "../../../lib/task.js";
import { PHI_PAYLOADS } from "../payloads.js";
import { phiRuntime } from "../runtime.js";

export const PAGE_EVERY_MINUTES = 10;
export const ESCALATE_AFTER_MINUTES = 30;
export const DEAD_MAN_FIRST_PAGE_MINUTES = 2;
export const DEAD_MAN_REPEAT_MINUTES = 12;

const CRISIS_SMS = pageText("Newpoint URGENT: a patient may be in crisis. Acknowledge in the staff console now:");
const CRISIS_CALL = pageText("Newpoint urgent page. A patient may be in crisis. Please open the staff console and acknowledge now.");
const DEAD_MAN_OPS = pageText("Newpoint ops: a crisis page was late or stopped repeating. The dead-man check re-paged on-call. Check ops.crisis-page.");

export interface CrisisPageDeps {
  readonly db: PhiDb;
  readonly logger: Logger;
  readonly twilio: Pick<Twilio, "page" | "call">;
  readonly env: Pick<PhiEnv, "PHI_ON_CALL_PRIMARY_PHONE" | "PHI_ON_CALL_SECONDARY_PHONE" | "PHI_OPS_PAGE_PHONE" | "PHI_STAFF_CONSOLE_URL">;
  readonly actor: string;
}

export type RoundResult = "paged" | "acknowledged" | "not_due" | "missing";

export async function pageRound(deps: CrisisPageDeps, crisisEventId: string): Promise<RoundResult> {
  const claim = await deps.db.tx(deps.actor, (q) =>
    q.query<{ escalated: boolean; previous_paged_at: Date | null; previous_escalated_at: Date | null }>(
      `with before as (select paged_at, escalated_at from phi.crisis_events where id = $1)
       update phi.crisis_events e
          set paged_at = now(),
              page_count = e.page_count + 1,
              escalated_at = case when e.escalated_at is null and e.detected_at <= now() - make_interval(mins => $2)
                                  then now() else e.escalated_at end
         from before
        where e.id = $1 and e.staff_ack_at is null
          and (e.paged_at is null or e.paged_at <= now() - make_interval(secs => $3))
        returning e.escalated_at is not null as escalated, before.paged_at as previous_paged_at,
                  before.escalated_at as previous_escalated_at`,
      // 30 s of slack, so a round that waited exactly PAGE_EVERY_MINUTES is due.
      [crisisEventId, ESCALATE_AFTER_MINUTES, PAGE_EVERY_MINUTES * 60 - 30],
    ),
  );
  const round = claim.rows[0];
  if (round === undefined) {
    const state = await deps.db.tx(deps.actor, (q) =>
      q.query<{ acked: boolean }>(`select staff_ack_at is not null as acked from phi.crisis_events where id = $1`, [crisisEventId]),
    );
    const row = state.rows[0];
    if (row === undefined) return "missing";
    return row.acked ? "acknowledged" : "not_due";
  }

  const sms = withLink(CRISIS_SMS, deps.env.PHI_STAFF_CONSOLE_URL);
  const pageOne = async (to: string): Promise<number> =>
    (await Promise.all([deliver(deps.logger, () => deps.twilio.page(to, sms)), deliver(deps.logger, () => deps.twilio.call(to, CRISIS_CALL))])).filter(Boolean)
      .length;
  const primary = pageOne(deps.env.PHI_ON_CALL_PRIMARY_PHONE);
  const secondary = round.escalated ? pageOne(deps.env.PHI_ON_CALL_SECONDARY_PHONE) : Promise.resolve(0);
  const [toPrimary, toSecondary] = await Promise.all([primary, secondary]);
  // The primary could not be reached at all: the secondary is paged in this same round, not after 30 minutes.
  const fallback = toPrimary === 0 && !round.escalated ? await pageOne(deps.env.PHI_ON_CALL_SECONDARY_PHONE) : 0;
  const delivered = toPrimary + toSecondary + fallback;
  if (delivered === 0) {
    await deps.db.tx(deps.actor, (q) =>
      q.query(`update phi.crisis_events set paged_at = $2, escalated_at = $3, page_count = page_count - 1 where id = $1`, [
        crisisEventId,
        round.previous_paged_at,
        round.previous_escalated_at,
      ]),
    );
    throw new Error("ops.crisis-page: no page was delivered");
  }
  return "paged";
}

/** One leg of a round. A failure is logged (class and status only) even when another leg got through. */
async function deliver(logger: Logger, send: () => Promise<string>): Promise<boolean> {
  try {
    await send();
    return true;
  } catch (error) {
    logger.error("crisis_page.delivery_failed", error);
    return false;
  }
}

export async function runCrisisDeadMan(deps: CrisisPageDeps): Promise<{ readonly repaged: number }> {
  const late = await deps.db.tx(deps.actor, (q) =>
    q.query<{ id: string }>(
      `select id from phi.crisis_events
        where staff_ack_at is null
          and ((paged_at is null and detected_at <= now() - make_interval(mins => $1))
               or paged_at <= now() - make_interval(mins => $2))
        order by detected_at`,
      [DEAD_MAN_FIRST_PAGE_MINUTES, DEAD_MAN_REPEAT_MINUTES],
    ),
  );
  let repaged = 0;
  let failed = false;
  for (const { id } of late.rows) {
    // Koret ops hears about it when the cron had to page, or tried and could not.
    let alertOps = false;
    try {
      if ((await pageRound(deps, id)) === "paged") {
        repaged += 1;
        alertOps = true;
      }
    } catch {
      failed = true;
      alertOps = true;
    }
    if (!alertOps) continue;
    try {
      await pageOpsOnce(deps, "crisis_dead_man", id, DEAD_MAN_OPS);
    } catch {
      failed = true;
    }
  }
  if (failed) throw new Error("ops.crisis-dead-man: a page failed");
  return { repaged };
}

/** One Koret ops page per (code, key). The page goes first; a failed page is retried next run. */
export async function pageOpsOnce(deps: Pick<CrisisPageDeps, "db" | "twilio" | "env" | "actor">, code: string, key: string, text: PageText): Promise<void> {
  const sent = await deps.db.tx(deps.actor, (q) => q.query(`select 1 from ops.page_log where code = $1 and key = $2`, [code, key]));
  if (sent.rows.length > 0) return;
  await deps.twilio.page(deps.env.PHI_OPS_PAGE_PHONE, text);
  await deps.db.tx(deps.actor, (q) => q.query(`insert into ops.page_log (code, key) values ($1, $2) on conflict do nothing`, [code, key]));
}

/** Rounds before the task hands over to the dead-man cron, which keeps paging until acknowledged. */
export const MAX_ROUNDS = 36;

const CRISIS_PAGE_ID = "ops.crisis-page";

export const crisisPage = phiTask({
  id: CRISIS_PAGE_ID,
  schema: PHI_PAYLOADS["ops.crisis-page"],
  retry: { maxAttempts: 5, factor: 1.5, minTimeoutInMs: 5_000, maxTimeoutInMs: 30_000 },
  maxDuration: 120,
  run: async ({ crisisEventId }) => {
    const rt = phiRuntime();
    const deps: CrisisPageDeps = { db: rt.db, twilio: rt.twilio, env: rt.env, logger: rt.logger, actor: CRISIS_PAGE_ID };
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      const result = await pageRound(deps, crisisEventId);
      if (result === "acknowledged" || result === "missing") return { result };
      await wait.for({ minutes: PAGE_EVERY_MINUTES });
    }
    return { result: "handed_to_dead_man" as const };
  },
});

const DEAD_MAN_ID = "ops.crisis-dead-man";

export const crisisDeadMan = phiSchedule({
  id: DEAD_MAN_ID,
  cron: { pattern: "* * * * *", timezone: "America/New_York" },
  retry: { maxAttempts: 2 },
  // Twilio legs time out at 10 s and run in parallel per event; a round fits well inside this.
  maxDuration: 120,
  run: async () => {
    const rt = phiRuntime();
    return runCrisisDeadMan({ db: rt.db, twilio: rt.twilio, env: rt.env, logger: rt.logger, actor: DEAD_MAN_ID });
  },
});
