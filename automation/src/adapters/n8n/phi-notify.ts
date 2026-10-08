/**
 * The PHI zone's only message to n8n (docs/automation-architecture.md §1, §6):
 * `{ kind: "action_required", at }`. n8n has no BAA, so it learns that something is
 * waiting in the staff console and nothing else: no ids, no counts, no kind of work.
 * The workflow it lands in sends staff a link to the console.
 */
import { VendorHttpError } from "../../lib/errors.js";
import { SECRET_HEADER, type FetchLike } from "../../lib/http.js";

export interface ActionRequired {
  readonly kind: "action_required";
  readonly at: string;
}

export interface PhiNotifier {
  actionRequired(at: Date): Promise<void>;
}

export function createPhiNotifier(options: { readonly url: string; readonly secret: string; readonly fetch: FetchLike }): PhiNotifier {
  return {
    async actionRequired(at) {
      // Minute precision: the timestamp cannot be used to line a notice up with one message.
      const minute = new Date(Math.floor(at.getTime() / 60_000) * 60_000);
      const event: ActionRequired = { kind: "action_required", at: minute.toISOString() };
      const response = await options.fetch(options.url, {
        method: "POST",
        headers: { "content-type": "application/json", [SECRET_HEADER]: options.secret },
        body: JSON.stringify(event),
      });
      if (!response.ok) throw new VendorHttpError("n8n", response.status);
    },
  };
}
