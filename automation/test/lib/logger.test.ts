import { describe, expect, it } from "vitest";
import { createLogger, entityId, type LogRecord } from "../../src/lib/logger.js";
import { VendorHttpError } from "../../src/lib/errors.js";
import { publicText, type Phi } from "../../src/lib/phi.js";

const fixedNow = () => new Date("2026-10-07T12:00:00.000Z");

function capture() {
  const records: LogRecord[] = [];
  return { records, logger: createLogger((record) => records.push(record), fixedNow) };
}

describe("createLogger", () => {
  it("emits structured records with public fields only", () => {
    const { records, logger } = capture();
    logger.info("seo.keyword_research.completed", {
      clusters: 12,
      run: entityId("run_cm1abc2def3ghi4jkl5mno6pq"),
      summary: publicText("{n} new keywords", { n: 40 }),
      partial: false,
    });
    expect(records).toEqual([
      {
        level: "info",
        event: "seo.keyword_research.completed",
        at: "2026-10-07T12:00:00.000Z",
        fields: { clusters: 12, run: "run_cm1abc2def3ghi4jkl5mno6pq", summary: "40 new keywords", partial: false },
      },
    ]);
  });

  it("logs errors as SafeError, without the vendor message", () => {
    const { records, logger } = capture();
    const cause = new Error("Invalid To number +16095550123");
    logger.error("gbp.sync.failed", new VendorHttpError("google", 403, { cause }));

    expect(records[0]?.error).toEqual({
      failureClass: "vendor_4xx",
      retryable: false,
      name: "VendorHttpError",
      code: "vendor_http_error",
      status: 403,
      vendor: "google",
    });
    expect(JSON.stringify(records)).not.toContain("+1609");
  });
});

describe("entityId", () => {
  it("accepts UUIDs and Trigger.dev run ids only", () => {
    expect(entityId("8d2f6c1e-4b7a-4c9e-9a1f-2b3c4d5e6f70")).toBe("8d2f6c1e-4b7a-4c9e-9a1f-2b3c4d5e6f70");
    expect(entityId("run_cm1abc2def3ghi4jkl5mno6pq")).toBe("run_cm1abc2def3ghi4jkl5mno6pq");
    expect(entityId("run_0123456789abcdefghijklmnop")).toBe("run_0123456789abcdefghijklmnop");
    expect(() => entityId("run_JohnSmith")).toThrow(TypeError);
    expect(() => entityId("run_abc123")).toThrow(TypeError);
    expect(() => entityId("+16095550123")).toThrow(TypeError);
    expect(() => entityId("jane.doe@example.com")).toThrow(TypeError);
  });
});

/** Compile-time guarantees; checked by `npm run typecheck`, never executed. */
export function typeLevelGuarantees(
  runtimeString: string,
  patientPhone: Phi<string>,
  patientAge: Phi<number>,
  event: string,
): void {
  const logger = createLogger(() => undefined);

  // @ts-expect-error a plain string field is not loggable
  logger.info("evt", { value: runtimeString });

  // @ts-expect-error PHI is not loggable
  logger.info("evt", { phone: patientPhone });

  // @ts-expect-error event names must be literals in source
  logger.info(event);

  // @ts-expect-error PHI is not an event name
  logger.info(patientPhone);

  // @ts-expect-error a template literal over runtime data is not an event name
  logger.info(`seen ${runtimeString}`);

  // @ts-expect-error a PHI number is not loggable
  logger.info("evt", { age: patientAge });

  // @ts-expect-error a computed key could carry PHI
  logger.info("evt", { [runtimeString]: true });

  // @ts-expect-error a PHI-keyed field could carry PHI
  logger.warn("evt", { [patientPhone]: 1 });

  logger.info("evt", { count: 1, ok: true, none: null });
  logger.error("evt", new Error("x"), { attempt: 2 });
}
