/**
 * The STANDARD (public) Anthropic org (docs/automation-architecture.md §2, §5).
 *
 * Only `PublicText` reaches it: `system` and `user` are typed so that a plain
 * string or a `Phi<T>` is a compile error. The HIPAA org has its own adapter,
 * which the zone rule keeps out of the marketing project.
 *
 * Model routing is §5's table, not a per-call choice. Every result is parsed
 * against a zod schema; a refusal, a truncated answer or a schema failure comes
 * back as `{ ok: false }` so the caller flags the item for a human. There is
 * no default category to fall back to.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import type { FetchLike } from "../google/search-console.js";
import type { PublicText } from "../../lib/phi.js";

/** §5 "LLM routes use one model per tier", as they run in the public org. */
export const PUBLIC_ROUTES = {
  /** `seo.keyword-research` clustering, `gbp.reply-drafter`, `social.*`, `geo.*`. */
  drafting: { model: "claude-sonnet-5-5", effort: "medium" },
  /** `social.compliance` review only (§5: Opus 5.5 is a recorded decision, not a per-task choice). */
  compliance: { model: "claude-opus-5-5", effort: "high" },
} as const;

export type PublicRoute = keyof typeof PUBLIC_ROUTES;

export type ParseFailure = "refusal" | "max_tokens" | "invalid_output";

export type ParseResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: ParseFailure };

export interface PublicClaude {
  parse<S extends z.ZodType>(request: {
    readonly route: PublicRoute;
    readonly system: PublicText;
    readonly user: PublicText;
    readonly schema: S;
    readonly maxTokens: number;
  }): Promise<ParseResult<z.output<S>>>;
}

export interface PublicClaudeOptions {
  readonly apiKey: string;
  /** Trigger.dev's `retry.fetch` in production (429/5xx only, §5.9); a fake in tests. */
  readonly fetch: FetchLike;
}

export function createPublicClaude(options: PublicClaudeOptions): PublicClaude {
  const client = new Anthropic({
    apiKey: options.apiKey,
    fetch: options.fetch,
    // Retries belong to the injected retry.fetch; two retry layers would multiply attempts.
    maxRetries: 0,
  });

  return {
    async parse({ route, system, user, schema, maxTokens }) {
      const { model, effort } = PUBLIC_ROUTES[route];
      // `create`, not `parse`: parse throws on a truncated or malformed answer and the
      // stop reason is lost. Here the stop reason is checked first, then zod decides.
      const response = await client.beta.messages.create({
        model,
        max_tokens: maxTokens,
        // Set explicitly per tier: Sonnet 5.5 defaults to `high`, Opus 5.5 to `medium` (§5).
        output_config: { effort, format: betaZodOutputFormat(schema) },
        // A policy decline is re-run server-side on Anthropic's recommended model for that category.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system,
        messages: [{ role: "user", content: user }],
      });

      if (response.stop_reason === "refusal") return { ok: false, reason: "refusal" };
      if (response.stop_reason === "max_tokens") return { ok: false, reason: "max_tokens" };

      const text = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        return { ok: false, reason: "invalid_output" };
      }
      const checked = schema.safeParse(json);
      return checked.success ? { ok: true, value: checked.data } : { ok: false, reason: "invalid_output" };
    },
  };
}
