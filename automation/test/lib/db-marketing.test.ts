import { describe, expect, it } from "vitest";
import { createMarketingPool } from "../../src/lib/db-marketing.js";

const CA = "-----BEGIN CERTIFICATE-----\nMIIfake\n-----END CERTIFICATE-----\n";

describe("createMarketingPool", () => {
  it("connects to the URL's host with CA-verified TLS, and ignores connection options in a query", async () => {
    const pool = createMarketingPool(
      "postgresql://trigger_marketing.abcdefghijklmnopqrst:p%40ss@aws-0-us-east-1.pooler.supabase.com:5432/postgres?host=evil.example&sslmode=disable",
      CA,
    );
    try {
      expect(pool.options).toMatchObject({
        host: "aws-0-us-east-1.pooler.supabase.com",
        port: 5432,
        user: "trigger_marketing.abcdefghijklmnopqrst",
        password: "p@ss",
        database: "postgres",
        ssl: { ca: CA, rejectUnauthorized: true, servername: "aws-0-us-east-1.pooler.supabase.com" },
      });
      expect(pool.options).not.toHaveProperty("connectionString");
      expect(pool.listenerCount("error")).toBe(1);
    } finally {
      await pool.end();
    }
  });
});
