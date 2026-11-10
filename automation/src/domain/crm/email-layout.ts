/**
 * Shared HTML for the CRM's emails (staff alert, lead confirmation).
 *
 * Table-based with inline styles, because that is what Gmail, Outlook and Apple
 * Mail all render the same way. Colours are the site's (app/globals.css): royal
 * #435ba8, ink #131c2e, the warm neutrals. The logo is the PNG served from the
 * site's public/brand: mail clients do not load SVG.
 */

export const C = {
  page: "#f4f2ed",
  card: "#ffffff",
  border: "#e7e4dd",
  ink: "#131c2e",
  body: "#403d36",
  muted: "#7c776d",
  royal: "#435ba8",
  tint: "#eef1f8",
} as const;

export const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="border-radius:6px;background:${C.royal};">
<a href="${esc(href)}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:15px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:6px;">${esc(label)}</a>
</td></tr></table>`;
}

export function paragraph(html: string, style = ""): string {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:24px;color:${C.body};${style}">${html}</p>`;
}

export interface LayoutOptions {
  readonly title: string;
  readonly preheader: string;
  /** Origin of the site, for the logo. */
  readonly siteOrigin: string;
  /** Shown after "Newpoint" in the header, e.g. "CRM". Omitted = name only. */
  readonly label?: string;
  /** Trusted HTML for inside the card. */
  readonly body: string;
  /** Trusted HTML under the card. */
  readonly footer: string;
}

export function layout(o: LayoutOptions): string {
  const label = o.label ? ` <span style="font-weight:400;color:${C.muted};">${esc(o.label)}</span>` : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(o.title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page};">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

<tr><td style="padding:0 4px 20px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle"><img src="${esc(`${o.siteOrigin}/brand/newpoint-mark-color.png`)}" width="28" height="28" alt="Newpoint" style="display:block;border:0;"></td>
<td valign="middle" style="padding-left:10px;font-family:${FONT};font-size:15px;font-weight:600;color:${C.ink};">Newpoint${label}</td>
</tr></table>
</td></tr>

<tr><td style="background:${C.card};border:1px solid ${C.border};border-radius:12px;padding:32px;">
${o.body}
</td></tr>

<tr><td style="padding:20px 4px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.muted};">${o.footer}</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export function heading(text: string): string {
  return `<h1 style="margin:0 0 8px;font-family:${FONT};font-size:24px;line-height:30px;font-weight:700;letter-spacing:-0.01em;color:${C.ink};">${esc(text)}</h1>`;
}
