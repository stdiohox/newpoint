import { describe, expect, it } from "vitest";
import { createClaudeWebSearchEngine, MAX_CONTINUATIONS, MAX_SEARCHES } from "../../src/adapters/geo/claude-web-search.js";
import type { FetchLike } from "../../src/adapters/google/search-console.js";
import { publicText } from "../../src/lib/phi.js";

const bodyOf = (init: RequestInit | undefined): string => (typeof init?.body === "string" ? init.body : "");

interface Reply {
  readonly stop_reason: string;
  readonly content: readonly unknown[];
}

function fakeMessagesApi(replies: readonly (Reply & { model?: string })[]) {
  const bodies: Record<string, unknown>[] = [];
  const queue = [...replies];
  const fetch: FetchLike = (_input, init) => {
    bodies.push(JSON.parse(bodyOf(init)) as Record<string, unknown>);
    const reply = queue.shift();
    if (!reply) throw new Error("unexpected request");
    return Promise.resolve(
      Response.json({
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: reply.model ?? "claude-sonnet-5-5",
        content: reply.content,
        stop_reason: reply.stop_reason,
        stop_sequence: null,
        stop_details: null,
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    );
  };
  return { fetch, bodies };
}

const cite = (url: string) => ({ type: "web_search_result_location", url, title: "t", cited_text: "c", encrypted_index: "e" });
const text = (value: string, urls: readonly string[] = []) => ({ type: "text", text: value, citations: urls.map(cite) });
const searchUse = { type: "server_tool_use", id: "srvtoolu_1", name: "web_search", input: { query: "psychiatric assessment nj" } };

const question = { prompt: publicText("Who offers psychiatric assessment in New Jersey?"), state: "NJ" as const };

describe("Claude web search engine", () => {
  it("asks the prompt as a user would, with web search located in the prompt's state", async () => {
    const { fetch, bodies } = fakeMessagesApi([
      { stop_reason: "end_turn", content: [text("Options include Princeton House ", ["https://princetonhouse.org/"]), text("and Newpoint.", ["https://newpointnp.com/"])] },
    ]);
    const engine = createClaudeWebSearchEngine({ apiKey: "sk-ant-test", fetch });

    const result = await engine.ask(question);

    expect(engine.id).toBe("claude-sonnet-5-5+web_search");
    expect(result).toEqual({
      ok: true,
      answer: { text: "Options include Princeton House and Newpoint.", citedUrls: ["https://princetonhouse.org/", "https://newpointnp.com/"] },
    });
    expect(bodies[0]).toMatchObject({
      model: "claude-sonnet-5-5",
      output_config: { effort: "medium" },
      fallbacks: "default",
      messages: [{ role: "user", content: "Who offers psychiatric assessment in New Jersey?" }],
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: 5,
          user_location: { type: "approximate", country: "US", region: "New Jersey", timezone: "America/New_York" },
        },
      ],
    });
    expect(bodies[0]).not.toHaveProperty("system");
  });

  it("resumes a paused turn by re-sending it, and keeps the text from both", async () => {
    const { fetch, bodies } = fakeMessagesApi([
      { stop_reason: "pause_turn", content: [text("First part. ", ["https://a.example/"]), searchUse] },
      { stop_reason: "end_turn", content: [text("Second part.", ["https://b.example/", "https://a.example/"])] },
    ]);
    const result = await createClaudeWebSearchEngine({ apiKey: "k", fetch }).ask({ ...question, state: null });

    expect(result).toEqual({
      ok: true,
      answer: { text: "First part. Second part.", citedUrls: ["https://a.example/", "https://b.example/"] },
    });
    expect(bodies[1]?.["messages"]).toEqual([
      { role: "user", content: "Who offers psychiatric assessment in New Jersey?" },
      { role: "assistant", content: [text("First part. ", ["https://a.example/"]), searchUse] },
    ]);
    expect((bodies[0]?.["tools"] as { user_location: object }[])[0]?.user_location).not.toHaveProperty("region");
  });

  it("gives up after the continuation cap instead of looping", async () => {
    const paused = { stop_reason: "pause_turn", content: [searchUse] };
    const { fetch, bodies } = fakeMessagesApi(Array.from({ length: MAX_CONTINUATIONS + 1 }, () => paused));
    expect(await createClaudeWebSearchEngine({ apiKey: "k", fetch }).ask(question)).toEqual({ ok: false, reason: "paused" });
    expect(bodies).toHaveLength(MAX_CONTINUATIONS + 1);
  });

  it("spends at most MAX_SEARCHES searches across continuations", async () => {
    const threeSearches = { stop_reason: "pause_turn", content: [searchUse, searchUse, searchUse] };
    const twoSearches = { stop_reason: "pause_turn", content: [searchUse, searchUse] };
    const { fetch, bodies } = fakeMessagesApi([threeSearches, twoSearches]);
    expect(await createClaudeWebSearchEngine({ apiKey: "k", fetch }).ask(question)).toEqual({ ok: false, reason: "paused" });
    const maxUses = bodies.map((body) => (body["tools"] as { max_uses: number }[])[0]?.max_uses);
    expect(maxUses).toEqual([MAX_SEARCHES, MAX_SEARCHES - 3]);
  });

  it.each([
    ["a different serving model", { stop_reason: "end_turn", model: "claude-opus-4-8", content: [text("Answer.")] }],
    ["a fallback block", { stop_reason: "end_turn", content: [{ type: "fallback", from: { model: "claude-sonnet-5-5" }, to: { model: "x" } }, text("Answer.")] }],
  ])("does not count an answer written by %s", async (_label, reply) => {
    const { fetch } = fakeMessagesApi([reply]);
    expect(await createClaudeWebSearchEngine({ apiKey: "k", fetch }).ask(question)).toEqual({ ok: false, reason: "fallback" });
  });

  it.each([
    ["incomplete", { stop_reason: "tool_use", content: [text("Let me check.")] }],
    ["refusal", { stop_reason: "refusal", content: [] }],
    ["max_tokens", { stop_reason: "max_tokens", content: [text("cut")] }],
    ["empty", { stop_reason: "end_turn", content: [searchUse] }],
  ])("reports %s as not measured", async (reason, reply) => {
    const { fetch } = fakeMessagesApi([reply]);
    expect(await createClaudeWebSearchEngine({ apiKey: "k", fetch }).ask(question)).toEqual({ ok: false, reason });
  });
});
