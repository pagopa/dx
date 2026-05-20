/**
 * Tests for the CLI environment schema.
 * Validates that process.env is parsed correctly before being passed to the CLI.
 */
import { describe, expect, it } from "vitest";

import { cliEnvSchema } from "../env.js";

describe("cliEnvSchema", () => {
  describe("CI field", () => {
    it("is undefined when CI is not set", () => {
      const result = cliEnvSchema.safeParse({});
      expect(result.success).toBe(true);
      expect(result.success && result.data.CI).toBeUndefined();
    });

    it("captures any non-empty CI value", () => {
      const result = cliEnvSchema.safeParse({ CI: "true" });
      expect(result.success).toBe(true);
      expect(result.success && result.data.CI).toBe("true");
    });

    it("captures CI=false as a string (presence is the signal, not the value)", () => {
      const result = cliEnvSchema.safeParse({ CI: "false" });
      expect(result.success).toBe(true);
      expect(result.success && result.data.CI).toBe("false");
    });

    it("captures CI=1 for numeric-style env vars", () => {
      const result = cliEnvSchema.safeParse({ CI: "1" });
      expect(result.success).toBe(true);
      expect(result.success && result.data.CI).toBe("1");
    });
  });

  it("passes through an object with unrelated env keys without failing", () => {
    const result = cliEnvSchema.safeParse({
      CI: "true",
      HOME: "/home/user",
      NODE_ENV: "test",
    });
    expect(result.success).toBe(true);
    expect(result.success && result.data.CI).toBe("true");
  });
});
