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

/** A review reply for the owner, shown beside the raw review (§5.2). */
export interface GbpReplyApprovalRequested {
  readonly kind: "gbp.reply_approval_requested";
  /** Google's opaque review id. */
  readonly review_id: string;
  readonly rating: number;
  /** The review as Google shows it, untouched, so the owner judges the reply against it. */
  readonly review_text: PublicText | null;
  readonly reviewer: PublicText | null;
  readonly draft: PublicText;
  readonly content_hash: string;
  readonly callback_url: string;
  readonly expires_at: string;
  /** true on the second request, after the first 72 h ran out (§5.2: "then a reminder is sent"). */
  readonly reminder: boolean;
}

/** Something a person at Koret must look at. Codes and ids only. */
export interface OpsAlert {
  readonly kind: "ops.alert";
  readonly code: "post_stuck_publishing";
  readonly post_id: string;
  readonly channel: "facebook" | "instagram" | "gbp" | "linkedin";
  readonly since: string;
  readonly minutes: number;
}

export type N8nEvent = SocialApprovalRequested | GbpReplyApprovalRequested | OpsAlert;

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
