import { describe, expect, it } from "vitest";
import { CONTAINER_POLLS, createMetaPublisher } from "../../src/adapters/social/meta.js";
import type { FetchLike } from "../../src/adapters/google/search-console.js";
import { VendorHttpError } from "../../src/lib/errors.js";

const env = { graphVersion: "v24.0", pageId: "1234567", pageAccessToken: "EAAG-page-token-xxxxxxxx", igUserId: "17841400000" };
const urlOf = (input: string | URL | Request): string => (typeof input === "string" ? input : input instanceof URL ? input.href : input.url);

function fakeGraph(replies: readonly Response[]) {
  const calls: { url: string; method: string; body: URLSearchParams | null; auth: string | null }[] = [];
  const queue = [...replies];
  const fetch: FetchLike = (input, init) => {
    calls.push({
      url: urlOf(input),
      method: init?.method ?? "GET",
      body: init?.body instanceof URLSearchParams ? init.body : null,
      auth: new Headers(init?.headers).get("authorization"),
    });
    const next = queue.shift();
    if (!next) throw new Error("unexpected request");
    return Promise.resolve(next);
  };
  return { fetch, calls };
}

describe("Meta publisher", () => {
  it("posts text to the Page feed, with the token in the body and never in the URL", async () => {
    const { fetch, calls } = fakeGraph([Response.json({ id: "1234567_890" })]);
    const ref = await createMetaPublisher({ env, fetch }).publishFacebook({ message: "Hello", imageUrl: null });
    expect(ref).toBe("1234567_890");
    expect(calls[0]?.url).toBe("https://graph.facebook.com/v24.0/1234567/feed");
    expect(calls[0]?.body?.get("message")).toBe("Hello");
    expect(calls[0]?.body?.get("access_token")).toBe(env.pageAccessToken);
    expect(calls.every((c) => !c.url.includes(env.pageAccessToken))).toBe(true);
  });

  it("posts an image to the Page as a photo with a caption", async () => {
    const { fetch, calls } = fakeGraph([Response.json({ id: "photo_1", post_id: "1234567_1" })]);
    await createMetaPublisher({ env, fetch }).publishFacebook({ message: "Hi", imageUrl: "https://newpointnp.com/a.jpg" });
    expect(calls[0]?.url).toBe("https://graph.facebook.com/v24.0/1234567/photos");
    expect(calls[0]?.body?.get("url")).toBe("https://newpointnp.com/a.jpg");
    expect(calls[0]?.body?.get("caption")).toBe("Hi");
  });

  it("publishes to Instagram in two steps, waiting for the container", async () => {
    const { fetch, calls } = fakeGraph([
      Response.json({ id: "container_1" }),
      Response.json({ status_code: "IN_PROGRESS" }),
      Response.json({ status_code: "FINISHED" }),
      Response.json({ id: "ig_media_1" }),
    ]);
    const ref = await createMetaPublisher({ env, fetch, sleep: () => Promise.resolve() }).publishInstagram({
      message: "Caption",
      imageUrl: "https://newpointnp.com/a.jpg",
    });
    expect(ref).toBe("ig_media_1");
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      "POST https://graph.facebook.com/v24.0/17841400000/media",
      "GET https://graph.facebook.com/v24.0/container_1?fields=status_code",
      "GET https://graph.facebook.com/v24.0/container_1?fields=status_code",
      "POST https://graph.facebook.com/v24.0/17841400000/media_publish",
    ]);
    expect(calls[1]?.auth).toBe(`Bearer ${env.pageAccessToken}`);
    expect(calls[3]?.body?.get("creation_id")).toBe("container_1");
  });

  it("gives up on a container that never finishes with a retryable error", async () => {
    const { fetch } = fakeGraph([
      Response.json({ id: "c" }),
      ...Array.from({ length: CONTAINER_POLLS }, () => Response.json({ status_code: "IN_PROGRESS" })),
    ]);
    const error = await createMetaPublisher({ env, fetch, sleep: () => Promise.resolve() })
      .publishInstagram({ message: "m", imageUrl: "https://newpointnp.com/a.jpg" })
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ vendor: "meta", status: 503, failureClass: "vendor_5xx" });
  });

  it("maps an HTTP error to its status without reading the body", async () => {
    const body = new ReadableStream({
      pull() {
        throw new Error("the error body must not be read");
      },
    });
    const { fetch } = fakeGraph([new Response(body, { status: 400 })]);
    const error = await createMetaPublisher({ env, fetch }).publishFacebook({ message: "m", imageUrl: null }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(VendorHttpError);
    expect(error).toMatchObject({ status: 400, failureClass: "vendor_4xx" });
  });
});
