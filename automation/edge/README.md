# Edge handlers (PHI zone)

`twilio-inbound/` and `intake/` (Phase 6) and `vapi-tools/` and `vapi-events/` (Phase 8)
are written as **host-agnostic fetch handlers**:
`(Request) => Promise<Response>`, with every dependency injected.

§3 names Supabase Edge Functions as the host, but **D5 is open**: Supabase has not yet
confirmed that Edge Functions are inside its BAA. Until it does, nothing here is
deployed. If D5 confirms Edge Functions, each folder gets a Deno `index.ts` that builds
the dependencies and calls `Deno.serve(handler)`; if it does not, the same handlers
mount on BAA-covered compute (§8 D5 fallback). The handlers do not change either way.

Tested under vitest against the embedded `newpoint-phi` database, as `phi_edge`.
