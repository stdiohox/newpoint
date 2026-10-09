/**
 * A small multipart/form-data parser for an already size-capped body (edge/intake referral
 * route). Text fields come back as strings, at most one file field as bytes. Anything it
 * does not understand is refused (null), never guessed at.
 */
export interface Multipart {
  readonly fields: Readonly<Record<string, string>>;
  readonly files: Readonly<Record<string, Uint8Array>>;
}

const MAX_PARTS = 12;

export function parseMultipart(body: Uint8Array, contentType: string): Multipart | null {
  const boundary = /;\s*boundary=(?:"([^"]{1,70})"|([^;\s]{1,70}))/i.exec(contentType);
  const token = boundary?.[1] ?? boundary?.[2];
  if (token === undefined) return null;
  const buf = Buffer.from(body);
  const delimiter = Buffer.from(`--${token}`);
  const fields: Record<string, string> = {};
  const files: Record<string, Uint8Array> = {};
  let position = buf.indexOf(delimiter);
  if (position !== 0) return null;
  for (let parts = 0; ; parts += 1) {
    if (parts > MAX_PARTS) return null;
    position += delimiter.length;
    if (buf.subarray(position, position + 2).toString() === "--") break; // closing delimiter
    if (buf.subarray(position, position + 2).toString() !== "\r\n") return null;
    position += 2;
    const headerEnd = buf.indexOf("\r\n\r\n", position);
    if (headerEnd < 0) return null;
    const headers = buf.subarray(position, headerEnd).toString("utf8");
    const next = buf.indexOf(Buffer.concat([Buffer.from("\r\n"), delimiter]), headerEnd + 4);
    if (next < 0) return null;
    const content = buf.subarray(headerEnd + 4, next);
    const disposition = /content-disposition:\s*form-data;\s*name="([A-Za-z0-9_]{1,40})"(?:;\s*filename="[^"\r\n]{0,255}")?/i.exec(headers);
    if (disposition?.[1] === undefined) return null;
    const name = disposition[1];
    if (name in fields || name in files) return null;
    if (/filename="/i.test(headers)) files[name] = new Uint8Array(content);
    else fields[name] = content.toString("utf8");
    position = next + 2;
  }
  return { fields, files };
}
