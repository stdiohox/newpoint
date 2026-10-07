import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  classifyError,
  classifyHttpStatus,
  ConfigError,
  isRetryable,
  SafeTaskError,
  toSafeError,
  toSafeTaskError,
  VendorHttpError,
} from "../../src/lib/errors.js";

describe("classifyHttpStatus", () => {
  it.each([
    [429, "rate_limited"],
    [408, "timeout"],
    [400, "vendor_4xx"],
    [404, "vendor_4xx"],
    [500, "vendor_5xx"],
    [503, "vendor_5xx"],
    [302, "unknown"],
  ] as const)("%i → %s", (status, expected) => {
    expect(classifyHttpStatus(status)).toBe(expected);
  });
});

describe("classifyError", () => {
  it("classifies zod failures as validation", () => {
    const result = z.string().safeParse(42);
    expect(result.success).toBe(false);
    expect(classifyError(result.error)).toBe("validation");
  });

  it("classifies aborts as timeouts", () => {
    expect(classifyError(new DOMException("aborted", "AbortError"))).toBe("timeout");
  });

  it("reads status off SDK-shaped errors", () => {
    expect(classifyError(Object.assign(new Error("x"), { status: 503 }))).toBe("vendor_5xx");
    expect(classifyError(Object.assign(new Error("x"), { statusCode: 429 }))).toBe("rate_limited");
  });

  it("falls back to unknown", () => {
    expect(classifyError("boom")).toBe("unknown");
    expect(classifyError(new Error("boom"))).toBe("unknown");
  });
});

describe("retryability", () => {
  it("retries only transient classes", () => {
    expect(isRetryable("rate_limited")).toBe(true);
    expect(isRetryable("vendor_5xx")).toBe(true);
    expect(isRetryable("timeout")).toBe(true);
    expect(isRetryable("vendor_4xx")).toBe(false);
    expect(isRetryable("validation")).toBe(false);
    // Transport failures with no status land here; tasks are idempotent.
    expect(isRetryable("unknown")).toBe(true);
  });
});

describe("toSafeError", () => {
  it("never carries the vendor's message, which can echo PHI", () => {
    const vendorMessage = "The 'To' number +16095550123 is not a valid phone number.";
    const cause = Object.assign(new Error(vendorMessage), { status: 400 });
    const safe = toSafeError(new VendorHttpError("twilio", 400, { cause }));

    expect(safe).toEqual({
      failureClass: "vendor_4xx",
      retryable: false,
      name: "VendorHttpError",
      code: "vendor_http_error",
      status: 400,
      vendor: "twilio",
    });
    expect(JSON.stringify(safe)).not.toContain("+1609");
  });

  it("drops the message of a raw error, too", () => {
    const safe = toSafeError(Object.assign(new Error("patient Jane Doe not found"), { status: 404 }));
    expect(JSON.stringify(safe)).not.toContain("Jane");
    expect(safe).toMatchObject({ failureClass: "vendor_4xx", status: 404, name: "Error" });
  });

  it("drops zod issue details, which quote the input", () => {
    const result = z.object({ phone: z.string().regex(/^\+1\d{10}$/) }).safeParse({ phone: "609-555-0123" });
    expect(result.success).toBe(false);
    expect(JSON.stringify(toSafeError(result.error))).not.toContain("555");
  });

  it("keeps ConfigError variable names out of the safe shape", () => {
    const error = new ConfigError("invalid_marketing_env", ["GSC_SITE_URL"]);
    expect(error.retryable).toBe(false);
    expect(toSafeError(error)).toEqual({
      failureClass: "validation",
      retryable: false,
      name: "ConfigError",
      code: "invalid_marketing_env",
    });
  });
});

describe("SafeTaskError", () => {
  it("replaces a vendor error with one whose message holds no input", async () => {
    const { runSafely } = await import("../../src/lib/task.js");
    const cause = new Error("Invalid To number +16095550123 for Jane Doe");
    const failing = () => Promise.reject(new VendorHttpError("google", 400, { cause }));
    const thrown = await runSafely(failing).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(SafeTaskError);
    const safe = thrown as SafeTaskError;
    expect(safe.message).toBe("vendor_4xx vendor_http_error google http_400");
    expect(safe.cause).toBeUndefined();
    expect(`${safe.message}\n${safe.stack ?? ""}`).not.toMatch(/1609|Jane/);
    expect(toSafeError(safe)).toEqual(safe.safe);
  });

  it("drops the message of an unknown error entirely", () => {
    const safe = toSafeTaskError(new TypeError("cannot read 'phone' of +16095550123"));
    expect(safe.message).toBe("unknown");
    expect(safe.safe.retryable).toBe(true);
  });

  it("keeps the retry decision of the original", () => {
    expect(toSafeTaskError(new VendorHttpError("anthropic", 529)).safe.retryable).toBe(true);
    expect(classifyError(toSafeTaskError(new VendorHttpError("google", 429)))).toBe("rate_limited");
  });
});
