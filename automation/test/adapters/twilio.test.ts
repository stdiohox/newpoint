import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createTwilio, pageText, verifyTwilioSignature, withLink } from "../../src/adapters/messaging/twilio.js";
import { renderTemplate } from "../../src/domain/messaging/templates.js";
import { toSafeError, VendorHttpError } from "../../src/lib/errors.js";
import type { Phi } from "../../src/lib/phi.js";

const CONFIG = { accountSid: `AC${"a".repeat(32)}`, authToken: "t".repeat(32), messagingServiceSid: `MG${"b".repeat(32)}`, voiceFrom: "+16095550100" };
const SID = `SM${"c".repeat(32)}`;
const phone = "+16095550111" as Phi<string>;

function recorder(status = 201, body: unknown = { sid: SID }) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const fetch = (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: url instanceof Request ? url.url : url.toString(), init });
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
  };
  return { calls, fetch: fetch };
}

describe("Twilio adapter", () => {
  it("sends through the Messaging Service with basic auth", async () => {
    const { calls, fetch } = recorder();
    expect(await createTwilio(CONFIG, fetch).sendSms(phone, renderTemplate("team_will_call"))).toBe(SID);
    expect(calls[0]?.url).toBe(`https://api.twilio.com/2010-04-01/Accounts/${CONFIG.accountSid}/Messages.json`);
    const params = new URLSearchParams(calls[0]?.init?.body as URLSearchParams);
    expect(params.get("To")).toBe(phone);
    expect(params.get("MessagingServiceSid")).toBe(CONFIG.messagingServiceSid);
  });

  it("a non-2xx is a VendorHttpError carrying the status only", async () => {
    const { fetch } = recorder(400, { message: "The 'To' number +16095550111 is not a valid phone number." });
    const error = await createTwilio(CONFIG, fetch).sendSms(phone, renderTemplate("team_will_call")).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(VendorHttpError);
    expect(JSON.stringify(toSafeError(error))).not.toContain("5550111");
    expect(toSafeError(error)).toMatchObject({ failureClass: "vendor_4xx", status: 400, vendor: "twilio" });
  });

  it("voice pages escape TwiML", async () => {
    const { calls, fetch } = recorder(201, { sid: `CA${"d".repeat(32)}` });
    await createTwilio(CONFIG, fetch).call("+16095550191", withLink(pageText("Newpoint test"), "https://x.test/?a=1&b=<2>"));
    const twiml = new URLSearchParams(calls[0]?.init?.body as URLSearchParams).get("Twiml") ?? "";
    expect(twiml).toContain("&amp;b=&lt;2&gt;");
    expect(twiml).not.toContain("<2>");
  });

  it("pages come from the voice number, not the patient Messaging Service", async () => {
    const { calls, fetch } = recorder();
    await createTwilio(CONFIG, fetch).page("+16095550191", pageText("Newpoint test"));
    const params = new URLSearchParams(calls[0]?.init?.body as URLSearchParams);
    expect(params.get("From")).toBe(CONFIG.voiceFrom);
    expect(params.get("MessagingServiceSid")).toBeNull();
  });

  it("page text must start with Newpoint, and links must be https", () => {
    expect(() => pageText("Hello")).toThrow();
    expect(() => withLink(pageText("Newpoint x"), "javascript:alert(1)")).toThrow();
  });
});

describe("verifyTwilioSignature", () => {
  const url = "https://edge.example.test/twilio-inbound";
  const params = { MessageSid: SID, From: "+16095550111", Body: "hello" };
  const sign = (u: string, p: Record<string, string>) =>
    createHmac("sha1", CONFIG.authToken).update(u + Object.keys(p).sort().map((k) => k + (p[k] ?? "")).join("")).digest("base64");

  it("accepts Twilio's signature over the exact URL and sorted params", () => {
    expect(verifyTwilioSignature(CONFIG.authToken, url, params, sign(url, params))).toBe(true);
  });
  it.each([
    ["a different URL", () => sign(`${url}?x=1`, params)],
    ["a tampered body", () => sign(url, { ...params, Body: "other" })],
    ["a truncated signature", () => sign(url, params).slice(0, 10)],
  ])("rejects %s", (_label, make) => {
    expect(verifyTwilioSignature(CONFIG.authToken, url, params, make())).toBe(false);
  });
  it("rejects a missing signature", () => {
    expect(verifyTwilioSignature(CONFIG.authToken, url, params, null)).toBe(false);
  });
});
