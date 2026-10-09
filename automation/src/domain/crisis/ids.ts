/** Deterministic ids for crisis events that several paths may raise for the same thing. */
import { createHash } from "node:crypto";

/** The voice crisis event id for a call: the edge and the call report raise the same one. */
export function crisisEventIdFor(callId: string): string {
  const h = createHash("sha256").update(`voice-crisis:${callId}`).digest("hex");
  const variant = ((parseInt(h.slice(16, 17), 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
