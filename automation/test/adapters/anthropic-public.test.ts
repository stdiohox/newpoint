import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createPublicClaude } from "../../src/adapters/llm/anthropic-public.js";
import type { FetchLike } from "../../src/adapters/google/search-console.js";
import { publicText } from "../../src/lib/phi.js";

const urlOf = (input: string | URL | Request): string =>
  typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
const bodyOf = (init: RequestInit | undefined): string => (typeof init?.body === "string" ? init.body : "");


interface Captured {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

/** A fake Messages API: records the request, answers with one text block. */
function fakeMessagesApi(answer: { text: string; stop_reason: string; status?: number }): { fetch: FetchLike; captured: Captured[] } {
  const captured: Captured[] = [];
  const fetch: FetchLike = (input, init) => {
    captured.push({
      url: urlOf(input),
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: JSON.parse(bodyOf(init)) as Record<string, unknown>,
    });
    if (answer.status !== undefined) {
      return Promise.resolve(Response.json({ type: "error", error: { type: "overloaded_error", message: "x" } }, { status: answer.status }));
    }
    return Promise.resolve(
      Response.json({
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: "claude-sonnet-5-5",
        content: answer.text === "" ? [] : [{ type: "text", text: answer.text }],
        stop_reason: answer.stop_reason,
        stop_sequence: null,
        stop_details: null,
        usage: { input_tokens: 10, output_tokens: 10 },
      }),
    );
  };
  return { fetch, captured };
}

const schema = z.object({ clusters: z.array(z.object({ name: z.string(), term_indexes: z.array(z.number().int()) })) });
const request = {
  route: "drafting" as const,
  system: publicText("Group the queries."),
  user: publicText("Queries:\n0. psychiatric assessment nj"),
  schema,
  maxTokens: 16_000,
};

describe("public Claude adapter", () => {
  it("sends §5's drafting route: Sonnet 5.5, effort medium, structured output, default fallbacks", async () => {
    const { fetch, captured } = fakeMessagesApi({
      text: JSON.stringify({ clusters: [{ name: "assessment", term_indexes: [0] }] }),
      stop_reason: "end_turn",
    });
    const claude = createPublicClaude({ apiKey: "sk-ant-test", fetch });

    const result = await claude.parse(request);

    expect(result).toEqual({ ok: true, value: { clusters: [{ name: "assessment", term_indexes: [0] }] } });
    const sent = captured[0];
    expect(sent?.url).toContain("/v1/messages");
    expect(sent?.headers["x-api-key"]).toBe("sk-ant-test");
    expect(sent?.headers["anthropic-beta"]).toContain("server-side-fallback-2026-07-01");
    expect(sent?.body).toMatchObject({
      model: "claude-sonnet-5-5",
      max_tokens: 16_000,
      fallbacks: "default",
      system: "Group the queries.",
      messages: [{ role: "user", content: "Queries:\n0. psychiatric assessment nj" }],
      output_config: { effort: "medium", format: { type: "json_schema" } },
    });
    expect(sent?.body).not.toHaveProperty("thinking");
    expect(sent?.body).not.toHaveProperty("tool_choice");
  });

  it.each([
    ["refusal", { text: "", stop_reason: "refusal" }, "refusal"],
    ["truncation", { text: '{"clusters": [', stop_reason: "max_tokens" }, "max_tokens"],
  ])("returns a flagged result on %s instead of data", async (_label, answer, reason) => {
    const claude = createPublicClaude({ apiKey: "sk-ant-test", fetch: fakeMessagesApi(answer).fetch });
    expect(await claude.parse(request)).toEqual({ ok: false, reason });
  });

  it("flags output that does not match the schema", async () => {
    const { fetch } = fakeMessagesApi({ text: JSON.stringify({ clusters: [{ name: 3 }] }), stop_reason: "end_turn" });
    const claude = createPublicClaude({ apiKey: "sk-ant-test", fetch });
    expect(await claude.parse(request)).toEqual({ ok: false, reason: "invalid_output" });
  });

  it("flags an answer that is not JSON", async () => {
    const { fetch } = fakeMessagesApi({ text: "Here are the clusters:", stop_reason: "end_turn" });
    const claude = createPublicClaude({ apiKey: "sk-ant-test", fetch });
    expect(await claude.parse(request)).toEqual({ ok: false, reason: "invalid_output" });
  });

  it("throws on an API error and does not retry by itself (retry.fetch owns retries)", async () => {
    const { fetch, captured } = fakeMessagesApi({ text: "", stop_reason: "end_turn", status: 529 });
    const claude = createPublicClaude({ apiKey: "sk-ant-test", fetch });
    await expect(claude.parse(request)).rejects.toMatchObject({ status: 529 });
    expect(captured).toHaveLength(1);
  });
});
