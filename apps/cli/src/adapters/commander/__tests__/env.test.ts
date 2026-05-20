/**
 * Tests for the CLI environment schema.
 * Validates that `cliEnvSchema` correctly parses `process.env`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { cliEnvSchema } from "../env.js";

describe("cliEnvSchema", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("CI field", () => {
    it("is undefined when CI is not set", () => {
      vi.stubEnv("CI", undefined);
      const result = cliEnvSchema.safeParse(process.env);
      expect(result.success).toBe(true);
      expect(result.success && result.data.CI).toBeUndefined();
    });

    it("captures any non-empty CI value", () => {
      vi.stubEnv("CI", "true");
      const result = cliEnvSchema.safeParse(process.env);
      expect(result.success).toBe(true);
      expect(result.success && result.data.CI).toBe("true");
    });

    it("captures CI=false as a string (presence is the signal, not the value)", () => {
      vi.stubEnv("CI", "false");
      const result = cliEnvSchema.safeParse(process.env);
      expect(result.success).toBe(true);
      expect(result.success && result.data.CI).toBe("false");
    });

    it("captures CI=1 for numeric-style env vars", () => {
      vi.stubEnv("CI", "1");
      const result = cliEnvSchema.safeParse(process.env);
      expect(result.success).toBe(true);
      expect(result.success && result.data.CI).toBe("1");
    });
  });

  it("passes through an object with unrelated env keys without failing", () => {
    vi.stubEnv("CI", "true");
    const result = cliEnvSchema.safeParse(process.env);
    expect(result.success).toBe(true);
    expect(result.success && result.data.CI).toBe("true");
  });
});
