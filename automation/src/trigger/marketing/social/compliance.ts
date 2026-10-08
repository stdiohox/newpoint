/**
 * social.compliance (§5.7): the evaluator in the evaluator-optimizer loop.
 *
 * Deterministic rules first (newpoint-rules.ts postViolations, plus the
 * channel's limits); only a draft that passes them goes to the LLM review
 * (claude-opus-5-5, effort high), which catches tone and implied claims.
 * A failed round sends the post back to the drafter with the feedback. After
 * three rounds it goes to a person with the report: approval still runs, the
 * owner sees that review did not pass, and the publisher still refuses any
 * rule break. A review that could not run (refused, malformed) counts as a
 * failed round, never as a pass.
 */
import { z } from "zod";
import type { PublicClaude } from "../../../adapters/llm/anthropic-public.js";
import { getSocialPost, transitionSocialPost, type Queryable } from "../../../lib/db-marketing.js";
import { entityId, type Logger } from "../../../lib/logger.js";
import { joinPublic, publicText } from "../../../lib/phi.js";
import { marketingTask } from "../../../lib/task.js";
import { postViolations, type PostRule } from "../../../domain/content-rules/newpoint-rules.js";
import { reviewerSystem, reviewerUser, reviewSchema } from "../../../prompts/social.js";
import { marketingRuntime } from "../runtime.js";
import { triggerNext, type SocialNext } from "./steps.js";

export const MAX_ROUNDS = 3;

export interface ComplianceDeps {
  readonly db: Queryable;
  readonly claude: PublicClaude;
  readonly logger: Logger;
  readonly next: Pick<SocialNext, "draft" | "approve">;
}

/** Stored in social_posts.compliance_report; the drafter reads `feedback`, the owner sees all of it. */
export interface ComplianceReport {
  readonly round: number;
  readonly passed: boolean;
  readonly rules: readonly PostRule[];
  readonly review: "passed" | "issues" | "not_run" | "unavailable";
  readonly feedback: readonly string[];
}

export async function runSocialCompliance(
  deps: ComplianceDeps,
  postId: string,
  reviewedRounds: number,
): Promise<{ readonly status: string }> {
  const post = await getSocialPost(deps.db, postId);
  if (!post || post.body === null || post.channel === "linkedin") return { status: "skipped" };
  // This round's verdict is already recorded (a retry after a lost hand-off): re-send the
  // hand-off it decided, without a second review. Both triggers are idempotent.
  if (post.rounds > reviewedRounds) {
    if (post.status === "in_compliance") await deps.next.approve(postId);
    else if (post.status === "drafted") await deps.next.draft(postId, post.rounds);
    return { status: "resumed" };
  }
  if (post.status !== "drafted" || post.rounds !== reviewedRounds) return { status: "skipped" };
  const round = post.rounds + 1;
  // Body and every alt text: all of it reaches the platform, all of it is checked.
  const text = joinPublic([post.body, ...post.media.map((m) => m.alt)], publicText("\n"));

  const violations = postViolations(post.body, post.media.map((m) => m.alt));
  const rules = violations.map((v) => v.rule);
  let review: ComplianceReport["review"] = "not_run";
  const feedback: string[] = violations.map((v) => v.fix);

  // The model reviews only what the rules already pass, so it spends effort on what rules cannot see.
  if (violations.length === 0) {
    const answer = await deps.claude.parse({
      route: "compliance",
      system: reviewerSystem,
      user: reviewerUser(text),
      schema: reviewSchema,
      maxTokens: 4_000,
    });
    if (!answer.ok) {
      review = "unavailable";
      feedback.push("The automated review could not run on this draft; a person must read it closely.");
    } else if (answer.value.pass && answer.value.issues.length === 0) {
      review = "passed";
    } else {
      review = "issues";
      for (const issue of answer.value.issues.slice(0, 10)) {
        feedback.push(`"${oneLine(issue.quote)}": ${oneLine(issue.problem)} Fix: ${oneLine(issue.fix)}`);
      }
    }
  }

  const passed = violations.length === 0 && review === "passed";
  const report: ComplianceReport = { round, passed, rules, review, feedback };

  if (!passed && round >= MAX_ROUNDS && violations.length > 0) {
    // Still breaking a rule written in code: the publisher would refuse it, so no owner is asked.
    await transitionSocialPost(deps.db, postId, ["drafted"], "rejected", {
      rounds: round,
      complianceReport: report,
      statusReason: "rules_failed_after_3_rounds",
    });
    deps.logger.info("social.compliance.rejected", { post: entityId(postId), round });
    return { status: "rejected" };
  }
  if (passed || round >= MAX_ROUNDS) {
    // Passed, or out of rounds with only review notes left: a person decides, with the report.
    const moved = await transitionSocialPost(deps.db, postId, ["drafted"], "in_compliance", { rounds: round, complianceReport: report });
    if (moved) await deps.next.approve(postId);
    deps.logger.info("social.compliance.to_approval", { post: entityId(postId), passed, round });
    return { status: passed ? "passed" : "to_owner_with_report" };
  }
  const moved = await transitionSocialPost(deps.db, postId, ["drafted"], "drafted", { rounds: round, complianceReport: report });
  if (moved) await deps.next.draft(postId, round);
  deps.logger.info("social.compliance.redraft", { post: entityId(postId), round });
  return { status: "redraft" };
}

/** Model text stored for people: one line, no control characters. */
const oneLine = (text: string): string => text.replace(/[\p{Cc}\p{Cf}]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 300);

export const socialCompliance = marketingTask({
  id: "social.compliance",
  schema: z.object({ postId: z.uuid(), round: z.number().int().min(0).max(2) }),
  maxDuration: 300,
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 30_000, maxTimeoutInMs: 300_000 },
  run: ({ postId, round }) => runSocialCompliance({ ...marketingRuntime(), next: triggerNext }, postId, round),
});
