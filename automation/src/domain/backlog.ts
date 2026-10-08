/**
 * A suggestion for a human editing the site repo (docs/automation-architecture.md
 * §4 content_backlog, §5.6). Agents never change the site themselves.
 */
export type BacklogKind = "page" | "faq" | "schema" | "citation";

export interface BacklogItem {
  readonly kind: BacklogKind;
  readonly target: string;
  readonly rationale: string;
}
