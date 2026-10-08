/** HTTP bits shared by both zones' adapters (no zone-specific imports). */
export type FetchLike = typeof fetch;

/** The header n8n's Header Auth credential checks (n8n/README.md §5). */
export const SECRET_HEADER = "x-newpoint-webhook-secret";
