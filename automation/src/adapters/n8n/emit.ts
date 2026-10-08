/**
 * The only way anything talks to n8n (docs/automation-architecture.md §0.5,
 * §3 adapters/n8n/emit.ts). It accepts N8nEvent only, and every free-text field
 * is PublicText, so nothing that is not provably public can reach the Hostinger
 * box. Each event kind posts to its own webhook, authenticated with that
 * webhook's Header Auth secret (n8n/README.md §5).
 */
import { VendorHttpError } from "../../lib/errors.js";
import type { PostRule } from "../../domain/content-rules/newpoint-rules.js";
import type { PublicText } from "../../lib/phi.js";
import type { FetchLike } from "../google/search-console.js";

/** The header n8n's Header Auth credential checks. */
export const SECRET_HEADER = "x-newpoint-webhook-secret";

/** A draft for the owners, and the one-time URL that completes the approval token. */
export interface SocialApprovalRequested {
  readonly kind: "social.approval_requested";
  readonly post_id: string;
  readonly channel: "facebook" | "instagram" | "gbp";
  readonly body: PublicText;
  readonly media: readonly { readonly url: PublicText; readonly alt: PublicText }[];
  readonly scheduled_for: string;
  readonly compliance: {
    /** false when three drafting rounds did not clear review: the owner decides, with the report. */
    readonly passed: boolean;
    readonly rounds: number;
    readonly rules: readonly PostRule[];
    readonly review_notes: readonly PublicText[];
  };
  readonly content_hash: string;
  /** Trigger.dev's one-time token URL. POSTing { approved, content_hash } to it completes the wait. */
  readonly callback_url: string;
  readonly expires_at: string;
}

export type N8nEvent = SocialApprovalRequested;

export interface N8nEmitter {
  emit(event: N8nEvent): Promise<void>;
}

export function createN8nEmitter(options: { readonly url: string; readonly secret: string; readonly fetch: FetchLike }): N8nEmitter {
  return {
    async emit(event) {
      const response = await options.fetch(options.url, {
        method: "POST",
        headers: { "content-type": "application/json", [SECRET_HEADER]: options.secret },
        body: JSON.stringify(event),
      });
      if (!response.ok) throw new VendorHttpError("n8n", response.status);
    },
  };
}
