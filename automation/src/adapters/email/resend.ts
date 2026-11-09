/**
 * Resend, for the lead CRM's new-lead alerts (docs/lead-crm.md).
 *
 * One POST per email. A non-2xx becomes a VendorHttpError carrying the status
 * only; the body is never read, because it can echo the request (§5.9 rule).
 * `fetch` is injected: production passes vendorFetch (retries 429 and 5xx).
 */
import { VendorHttpError } from "../../lib/errors.js";
import type { FetchLike } from "../../lib/http.js";

const ENDPOINT = "https://api.resend.com/emails";

export interface Email {
  readonly to: readonly string[];
  readonly subject: string;
  readonly text: string;
}

export interface EmailSender {
  send(email: Email): Promise<void>;
}

export interface ResendOptions {
  readonly apiKey: string;
  /** "Newpoint CRM <crm@newpointnp.com>": a sender on a domain verified in Resend. */
  readonly from: string;
  readonly fetch: FetchLike;
}

export function createResendSender(options: ResendOptions): EmailSender {
  return {
    async send(email) {
      const response = await options.fetch(ENDPOINT, {
        method: "POST",
        headers: { authorization: `Bearer ${options.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ from: options.from, to: email.to, subject: email.subject, text: email.text }),
      });
      if (!response.ok) throw new VendorHttpError("resend", response.status);
    },
  };
}
