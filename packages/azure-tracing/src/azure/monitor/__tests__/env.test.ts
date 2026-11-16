/**
 * Tests for env.ts — validates that loadEnv() correctly parses and validates
 * environment variables used to configure the Azure Monitor integration.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

describe("loadEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const stubConnectionString = () => {
    vi.stubEnv(
      "APPLICATIONINSIGHTS_CONNECTION_STRING",
      "InstrumentationKey=test-key",
    );
  };

  it("succeeds with only the connection string (backward-compatible default)", async () => {
    stubConnectionString();
    const { loadEnv } = await import("../env.js");

    const env = loadEnv();

    expect(env).toStrictEqual({
      APPINSIGHTS_SAMPLING_PERCENTAGE: 0.05,
      APPLICATIONINSIGHTS_CONNECTION_STRING: "InstrumentationKey=test-key",
      APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED: false,
    });
  });

  it("tolerates a missing connection string, which the options resolver validates", async () => {
    const { loadEnv } = await import("../env.js");

    const env = loadEnv();

    expect(env.APPLICATIONINSIGHTS_CONNECTION_STRING).toBeUndefined();
    expect(env.APPINSIGHTS_SAMPLING_PERCENTAGE).toBe(0.05);
  });

  it("parses APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED=true", async () => {
    stubConnectionString();
    vi.stubEnv("APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED", "true");
    const { loadEnv } = await import("../env.js");

    const env = loadEnv();

    expect(env).toStrictEqual({
      APPINSIGHTS_SAMPLING_PERCENTAGE: 0.05,
      APPLICATIONINSIGHTS_CONNECTION_STRING: "InstrumentationKey=test-key",
      APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED: true,
    });
  });

  it("parses APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED=false", async () => {
    stubConnectionString();
    vi.stubEnv("APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED", "false");
    const { loadEnv } = await import("../env.js");

    const env = loadEnv();

    expect(env).toStrictEqual({
      APPINSIGHTS_SAMPLING_PERCENTAGE: 0.05,
      APPLICATIONINSIGHTS_CONNECTION_STRING: "InstrumentationKey=test-key",
      APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED: false,
    });
  });

  it("rejects invalid APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED values", async () => {
    stubConnectionString();
    vi.stubEnv("APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED", "anInvalidValue");
    const { loadEnv } = await import("../env.js");

    expect(() => loadEnv()).toThrow(
      /APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED[\s\S]*Invalid option/i,
    );
  });

  it("parses environment variables", async () => {
    stubConnectionString();
    vi.stubEnv("APPINSIGHTS_SAMPLING_PERCENTAGE", "60");
    vi.stubEnv("APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED", "true");
    const { loadEnv } = await import("../env.js");

    const env = loadEnv();
    expect(env).toStrictEqual({
      APPINSIGHTS_SAMPLING_PERCENTAGE: 0.6,
      APPLICATIONINSIGHTS_CONNECTION_STRING: "InstrumentationKey=test-key",
      APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED: true,
    });
  });
});
