/**
 * The private bucket for referral documents (docs/automation-architecture.md §5.5, §6: the
 * one inbound document path; documents go only here and to the Anthropic HIPAA org).
 *
 * Supabase Storage on newpoint-phi, a PRIVATE bucket, reached with a storage-scoped JWT (never
 * the service_role key): the bucket's storage.objects policies grant that role put / get /
 * delete in this bucket only — a go-live setup step. Paths are server-chosen UUIDs; nothing a
 * referrer typed ever becomes part of a path.
 */
import { VendorHttpError } from "../../lib/errors.js";
import type { FetchLike } from "../../lib/http.js";

export interface ReferralStore {
  put(path: string, bytes: Uint8Array, contentType: "application/pdf"): Promise<void>;
  get(path: string): Promise<Uint8Array | null>;
  remove(path: string): Promise<void>;
}

const PATH = /^referrals\/[0-9a-f-]{36}\.pdf$/;

export function referralPath(id: string): string {
  const path = `referrals/${id}.pdf`;
  if (!PATH.test(path)) throw new TypeError("referralPath: not a uuid");
  return path;
}

export function createSupabaseReferralStore(options: {
  readonly projectUrl: string;
  readonly bucket: string;
  readonly jwt: string;
  readonly fetch: FetchLike;
}): ReferralStore {
  const base = `${options.projectUrl.replace(/\/+$/, "")}/storage/v1/object/${options.bucket}`;
  const auth = { authorization: `Bearer ${options.jwt}` };
  const check = (path: string) => {
    if (!PATH.test(path)) throw new TypeError("referral store: bad path");
  };
  return {
    async put(path, bytes, contentType) {
      check(path);
      const response = await options.fetch(`${base}/${path}`, {
        method: "POST",
        headers: { ...auth, "content-type": contentType, "x-upsert": "false" },
        body: bytes,
      });
      if (!response.ok) throw new VendorHttpError("supabase", response.status);
    },
    async get(path) {
      check(path);
      const response = await options.fetch(`${base}/${path}`, { headers: auth });
      // Only "not found" means missing; anything else (auth, 5xx, a transient 400) is retried.
      if (response.status === 404) return null;
      if (!response.ok) throw new VendorHttpError("supabase", response.status);
      return new Uint8Array(await response.arrayBuffer());
    },
    async remove(path) {
      check(path);
      const response = await options.fetch(`${base}/${path}`, { method: "DELETE", headers: auth });
      if (!response.ok && response.status !== 404) throw new VendorHttpError("supabase", response.status);
    },
  };
}

/** In-memory store for tests and local development. */
export function memoryReferralStore(): ReferralStore & { readonly files: Map<string, Uint8Array> } {
  const files = new Map<string, Uint8Array>();
  return {
    files,
    put: (path, bytes) => {
      files.set(path, bytes);
      return Promise.resolve();
    },
    get: (path) => Promise.resolve(files.get(path) ?? null),
    remove: (path) => {
      files.delete(path);
      return Promise.resolve();
    },
  };
}
