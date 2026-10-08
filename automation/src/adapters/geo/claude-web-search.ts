/**
 * Claude with the web search server tool, in the STANDARD (public) Anthropic
 * org (docs/automation-architecture.md §2, §5.6). The only engine in v1 (D9).
 *
 * The prompt goes in as a user would type it: no system prompt and no hint
 * about Newpoint, so the answer measures what the engine says unprompted.
 * Location is set from the prompt's state, as a person searching from there
 * would have it.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { PUBLIC_ROUTES } from "../llm/anthropic-public.js";
import type { FetchLike } from "../google/search-console.js";
import { fromPublicSource } from "../../lib/phi.js";
import type { GeoAskResult, GeoEngine, UsState } from "./engine.js";

/** Server-side search loops can pause (`pause_turn`); resuming is bounded. */
export const MAX_CONTINUATIONS = 3;
/**
 * Searches per probe, across all continuations. `max_uses` is per request, so
 * each continuation gets only what the earlier turns left.
 */
export const MAX_SEARCHES = 5;

const REGION: Readonly<Record<UsState, string>> = { NJ: "New Jersey", PA: "Pennsylvania" };

export interface ClaudeWebSearchOptions {
  readonly apiKey: string;
  readonly fetch: FetchLike;
}

export function createClaudeWebSearchEngine(options: ClaudeWebSearchOptions): GeoEngine {
  const client = new Anthropic({ apiKey: options.apiKey, fetch: options.fetch, maxRetries: 0 });
  const { model, effort } = PUBLIC_ROUTES.drafting;

  return {
    id: `${model}+web_search`,

    async ask({ prompt, state }): Promise<GeoAskResult> {
      const messages: BetaMessageParam[] = [{ role: "user", content: prompt }];
      let searchesUsed = 0;
      for (let continuation = 0; ; continuation += 1) {
        const remaining = MAX_SEARCHES - searchesUsed;
        if (remaining <= 0) return { ok: false, reason: "paused" };
        const response = await client.beta.messages.create({
          model,
          max_tokens: 8_000,
          output_config: { effort },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          tools: [
            {
              type: "web_search_20260209",
              name: "web_search",
              max_uses: remaining,
              user_location: {
                type: "approximate",
                country: "US",
                timezone: "America/New_York",
                ...(state === null ? {} : { region: REGION[state] }),
              },
            },
          ],
          messages,
        });

        searchesUsed += response.content.filter((block) => block.type === "server_tool_use" && block.name === "web_search").length;
        // An answer a fallback model wrote measures that model, not this engine's series.
        if (response.model !== model || response.content.some((block) => block.type === "fallback")) {
          return { ok: false, reason: "fallback" };
        }
        if (response.stop_reason === "pause_turn") {
          if (continuation >= MAX_CONTINUATIONS) return { ok: false, reason: "paused" };
          // The server resumes from the trailing server_tool_use block; no "continue" message.
          messages.push({ role: "assistant", content: response.content });
          continue;
        }
        if (response.stop_reason === "refusal") return { ok: false, reason: "refusal" };
        if (response.stop_reason === "max_tokens") return { ok: false, reason: "max_tokens" };
        if (response.stop_reason !== "end_turn" && response.stop_reason !== "stop_sequence") {
          return { ok: false, reason: "incomplete" };
        }

        // Text from every turn of the conversation counts: a resumed answer continues the earlier one.
        const blocks = [
          ...messages.flatMap((message) => (message.role === "assistant" && Array.isArray(message.content) ? message.content : [])),
          ...response.content,
        ];
        let text = "";
        const citedUrls: string[] = [];
        for (const block of blocks) {
          if (block.type !== "text") continue;
          text += block.text;
          for (const citation of block.citations ?? []) {
            if (citation.type === "web_search_result_location" && !citedUrls.includes(citation.url)) {
              citedUrls.push(citation.url);
            }
          }
        }
        if (text.trim() === "") return { ok: false, reason: "empty" };
        return { ok: true, answer: { text: fromPublicSource("public_web_answer", text), citedUrls } };
      }
    },
  };
}
