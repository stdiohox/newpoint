import { describe, expect, it } from "vitest";
import { createN8nEmitter, SECRET_HEADER, type SocialApprovalRequested } from "../../src/adapters/n8n/emit.js";
import type { FetchLike } from "../../src/adapters/google/search-console.js";
import { publicText } from "../../src/lib/phi.js";

const event: SocialApprovalRequested = {
  kind: "social.approval_requested",
  post_id: "00000000-0000-4000-8000-000000000001",
  channel: "facebook",
  body: publicText("A post."),
  media: [],
  scheduled_for: "2026-10-19T14:00:00.000Z",
  compliance: { passed: true, rounds: 1, rules: [], review_notes: [] },
  content_hash: "a".repeat(64),
  callback_url: "https://api.trigger.dev/api/v1/waitpoints/tokens/x/callback/y",
  expires_at: "2026-10-15T14:00:00.000Z",
};

describe("n8n emitter", () => {
  it("posts the event with the webhook's Header Auth secret", async () => {
    let seen: { url: string; headers: Headers; body: unknown } | undefined;
    const fetch: FetchLike = (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      seen = { url, headers: new Headers(init?.headers), body: JSON.parse(typeof init?.body === "string" ? init.body : "null") as unknown };
      return Promise.resolve(new Response(null, { status: 200 }));
    };
    await createN8nEmitter({ url: "https://n8n.example/webhook/newpoint-social-approval", secret: "s".repeat(32), fetch }).emit(event);
    expect(seen?.headers.get(SECRET_HEADER)).toBe("s".repeat(32));
    expect(seen?.body).toEqual(event);
  });

  it("fails on a non-2xx so the approval step retries", async () => {
    const fetch: FetchLike = () => Promise.resolve(new Response(null, { status: 502 }));
    await expect(createN8nEmitter({ url: "https://n8n.example/w", secret: "s".repeat(32), fetch }).emit(event)).rejects.toMatchObject({
      vendor: "n8n",
      status: 502,
    });
  });
});
