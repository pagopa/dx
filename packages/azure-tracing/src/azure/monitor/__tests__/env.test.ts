/**
 * Tests for env.ts — validates that loadEnv() correctly parses and validates
 * environment variables used to configure the Azure Monitor integration.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

describe("loadEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const stubRequiredEnvVariables = () => {
    vi.stubEnv(
      "APPLICATIONINSIGHTS_CONNECTION_STRING",
      "InstrumentationKey=test-key",
    );
  };

  it("succeeds with only the connection string (backward-compatible default)", async () => {
    stubRequiredEnvVariables();
    const { loadEnv } = await import("../env.js");

    const env = loadEnv();

    expect(env).toStrictEqual({
      APPINSIGHTS_SAMPLING_PERCENTAGE: 0.05,
      APPLICATIONINSIGHTS_CONNECTION_STRING: "InstrumentationKey=test-key",
      APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED: false,
    });
  });

  it("throws when required environment variable is missing", async () => {
    const { loadEnv } = await import("../env.js");

    expect(() => loadEnv()).toThrow();
  });

  it("parses APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED=true", async () => {
    stubRequiredEnvVariables();
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
    stubRequiredEnvVariables();
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
    stubRequiredEnvVariables();
    vi.stubEnv("APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED", "anInvalidValue");
    const { loadEnv } = await import("../env.js");

    expect(() => loadEnv()).toThrow(
      /APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED[\s\S]*Invalid option/i,
    );
  });

  it("parses environment variables", async () => {
    stubRequiredEnvVariables();
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
