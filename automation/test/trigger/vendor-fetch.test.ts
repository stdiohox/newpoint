/**
 * vendorFetch runs the real retry.fetch from @trigger.dev/sdk against a stubbed
 * global fetch, so the headers and retry behaviour tested are the SDK's own.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { vendorFetch } from "../../src/trigger/marketing/runtime.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(statuses: readonly number[]) {
  const seen: Headers[] = [];
  const queue = [...statuses];
  vi.stubGlobal("fetch", (_input: unknown, init?: RequestInit) => {
    seen.push(new Headers(init?.headers));
    return Promise.resolve(new Response("{}", { status: queue.shift() ?? 200 }));
  });
  return seen;
}

describe("vendorFetch", () => {
  it("forwards headers given as a Headers instance (what the Anthropic SDK passes)", async () => {
    const seen = stubFetch([200]);
    await vendorFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: new Headers({ "x-api-key": "sk-ant-test", "anthropic-beta": "server-side-fallback-2026-07-01" }),
    });
    expect(seen[0]?.get("x-api-key")).toBe("sk-ant-test");
    expect(seen[0]?.get("anthropic-beta")).toBe("server-side-fallback-2026-07-01");
  });

  it("does not retry a 4xx", async () => {
    const seen = stubFetch([403, 200]);
    const response = await vendorFetch("https://searchconsole.googleapis.com/x", { method: "POST", headers: {} });
    expect(response.status).toBe(403);
    expect(seen).toHaveLength(1);
  });
});
