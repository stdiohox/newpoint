/**
 * Meta Graph API: Facebook Page and Instagram publishing
 * (docs/automation-architecture.md §5.7; D10: Facebook and Instagram first).
 *
 * Publishing credentials live only in the newpoint-marketing Trigger.dev
 * project, never in n8n (§2). The Page token travels in the POST body, never
 * in a URL. A non-2xx response becomes a VendorHttpError with the status only;
 * the body is never read, because Graph errors can echo the request.
 *
 * Not sent yet: alt text. Meta's alt-text parameters are to be confirmed against
 * the pinned META_GRAPH_VERSION during app review; until then alt text is
 * written, approved and stored, and the publisher does not send it.
 */
import { z } from "zod";
import { VendorHttpError } from "../../lib/errors.js";
import type { MetaEnv } from "../../lib/env.js";
import type { FetchLike } from "../google/search-console.js";

const GRAPH = "https://graph.facebook.com";

export interface MetaPost {
  readonly message: string;
  /** A public https image URL, required for Instagram. */
  readonly imageUrl: string | null;
}

export interface MetaPublisher {
  publishFacebook(post: MetaPost): Promise<string>;
  publishInstagram(post: MetaPost & { readonly imageUrl: string }): Promise<string>;
}

const idSchema = z.object({ id: z.string().min(1) });
const statusSchema = z.object({ status_code: z.enum(["EXPIRED", "ERROR", "FINISHED", "IN_PROGRESS", "PUBLISHED"]) });

export interface MetaOptions {
  readonly env: MetaEnv;
  readonly fetch: FetchLike;
  /** Injected so tests do not wait. */
  readonly sleep?: (ms: number) => Promise<void>;
}

/** Instagram processes a container before it can be published; images are usually ready in seconds. */
export const CONTAINER_POLLS = 6;

export function createMetaPublisher(options: MetaOptions): MetaPublisher {
  const { env } = options;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const base = `${GRAPH}/${env.graphVersion}`;

  async function call(method: "GET" | "POST", path: string, params: Record<string, string>): Promise<unknown> {
    const body = new URLSearchParams({ ...params, access_token: env.pageAccessToken });
    const response =
      method === "POST"
        ? await options.fetch(`${base}/${path}`, { method, body, headers: { "content-type": "application/x-www-form-urlencoded" } })
        : await options.fetch(`${base}/${path}?fields=${encodeURIComponent(params["fields"] ?? "")}`, {
            method,
            headers: { authorization: `Bearer ${env.pageAccessToken}` },
          });
    if (!response.ok) throw new VendorHttpError("meta", response.status);
    return response.json();
  }

  return {
    async publishFacebook({ message, imageUrl }) {
      const result =
        imageUrl === null
          ? await call("POST", `${env.pageId}/feed`, { message })
          : await call("POST", `${env.pageId}/photos`, { url: imageUrl, caption: message });
      return idSchema.parse(result).id;
    },

    async publishInstagram({ message, imageUrl }) {
      if (!env.igUserId) throw new VendorHttpError("meta", 400);
      const container = idSchema.parse(await call("POST", `${env.igUserId}/media`, { image_url: imageUrl, caption: message })).id;
      for (let poll = 0; poll < CONTAINER_POLLS; poll += 1) {
        const { status_code } = statusSchema.parse(await call("GET", container, { fields: "status_code" }));
        if (status_code === "FINISHED") {
          return idSchema.parse(await call("POST", `${env.igUserId}/media_publish`, { creation_id: container })).id;
        }
        if (status_code === "ERROR" || status_code === "EXPIRED") throw new VendorHttpError("meta", 422);
        await sleep(5_000);
      }
      // Still processing: a 503-class failure, so the task-level retry tries again later.
      throw new VendorHttpError("meta", 503);
    },
  };
}
