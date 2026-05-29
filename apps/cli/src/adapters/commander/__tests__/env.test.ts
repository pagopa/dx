import fc from "fast-check";
/**
 * Tests for the CLI environment schema.
 * Validates that `cliEnvSchema` correctly parses `process.env`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { cliEnvSchema } from "../env.js";

// The accepted stringbool values mirror those recognised by z.stringbool().
const CI_TRUTHY = ["true", "1", "yes", "y", "on"];
const CI_FALSEY = ["false", "0", "no", "n", "off"];
const CI_ACCEPTED = [...CI_TRUTHY, ...CI_FALSEY];

describe("cliEnvSchema", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("CI field", () => {
    it("should be true for truthy string-bool values", () => {
      fc.assert(
        fc.property(fc.constantFrom(...CI_TRUTHY), (value) => {
          vi.stubEnv("CI", value);
          const result = cliEnvSchema.safeParse(process.env);

          expect(result.success).toBe(true);
          expect(result.success && result.data.CI).toBe(true);
        }),
      );
    });

    it("should be false for falsey string-bool values or when unset", () => {
      fc.assert(
        fc.property(fc.constantFrom(...CI_FALSEY, undefined), (value) => {
          vi.stubEnv("CI", value);
          const result = cliEnvSchema.safeParse(process.env);

          expect(result.success).toBe(true);
          expect(result.success && result.data.CI).toBe(false);
        }),
      );
    });

    it("should not parse unrecognised values", () => {
      fc.assert(
        fc.property(
          // Every string not in the accepted list
          fc.string().filter((s) => !CI_ACCEPTED.includes(s.toLowerCase())),
          (value) => {
            vi.stubEnv("CI", value);
            const result = cliEnvSchema.safeParse(process.env);

            expect(result.success).toBe(false);
            expect(result.error).toBeInstanceOf(z.ZodError);
          },
        ),
      );
    });
  });
});
