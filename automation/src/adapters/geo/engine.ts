/**
 * An answer engine probed by geo.probe (docs/automation-architecture.md §5.6).
 *
 * D9: Claude only in v1. ChatGPT, Perplexity, Gemini and Google AI Overviews
 * each need their own API or a SERP provider; each becomes one more
 * implementation of this interface and one more entry in the runtime's engine
 * list, with no change to the task or the analysis.
 */
import type { PublicText } from "../../lib/phi.js";

export type UsState = "NJ" | "PA";

export interface GeoQuestion {
  readonly prompt: PublicText;
  /** Where the asker is, when the prompt is about a state. Engines that support location use it. */
  readonly state: UsState | null;
}

export interface GeoAnswer {
  /** The engine's answer as a user would read it. Public: grounded in the public web. */
  readonly text: PublicText;
  /** Every URL the engine cited for the answer, deduplicated, in order of first citation. */
  readonly citedUrls: readonly string[];
}

/**
 * Anything but a complete answer from this engine is not a measurement, so it
 * is never stored as "not mentioned": a refusal, a cut-off or unfinished turn,
 * an empty answer, or an answer a fallback model wrote (a different engine).
 */
export type NotMeasured = "refusal" | "max_tokens" | "paused" | "empty" | "incomplete" | "fallback";

export type GeoAskResult =
  | { readonly ok: true; readonly answer: GeoAnswer }
  | { readonly ok: false; readonly reason: NotMeasured };

export interface GeoEngine {
  /** Stored in geo_runs.engine. Changing it starts a new series. */
  readonly id: string;
  ask(question: GeoQuestion): Promise<GeoAskResult>;
}
