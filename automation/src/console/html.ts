/**
 * Escaping HTML for the staff console (docs/automation-architecture.md §6 layer 6:
 * extracted and inbound text is always rendered escaped). Every interpolated value is
 * escaped unless it is itself an `Html` fragment built by this tag.
 */
declare const htmlBrand: unique symbol;
export type Html = { readonly [htmlBrand]: true; readonly value: string };

const fragment = (value: string): Html => ({ value }) as Html;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type Value = Html | string | number | boolean | null | undefined | readonly Html[];

function render(value: Value): string {
  if (value === null || value === undefined || value === false) return "";
  if (Array.isArray(value)) return (value as readonly Html[]).map((item) => item.value).join("");
  if (typeof value === "object") return (value as Html).value;
  return escapeHtml(String(value));
}

export function html(strings: TemplateStringsArray, ...values: Value[]): Html {
  let out = strings[0] ?? "";
  values.forEach((value, i) => {
    out += render(value) + (strings[i + 1] ?? "");
  });
  return fragment(out);
}
