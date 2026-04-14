/**
 * Tests for initFromEnv.
 * Verifies that the correct Azure Monitor options are passed depending on
 * whether managed identity authentication is enabled via the environment.
 */
import assert from "node:assert";

import { DefaultAzureCredential } from "@azure/identity";
import { useAzureMonitor } from "@azure/monitor-opentelemetry";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@azure/monitor-opentelemetry", () => ({
  useAzureMonitor: vi.fn(),
}));

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: vi.fn(),
}));

const useAzureMonitorMock = vi.mocked(useAzureMonitor);

const BASE_ENV = {
  APPLICATIONINSIGHTS_CONNECTION_STRING:
    "InstrumentationKey=00000000-0000-0000-0000-000000000000",
};

/** Retrieves the options passed to the first `useAzureMonitor` call. */
const getCalledOptions = () => {
  const call = useAzureMonitorMock.mock.calls[0];
  assert(call !== undefined, "useAzureMonitor was not called");
  const [options] = call;
  assert(options !== undefined, "useAzureMonitor was called without arguments");
  return options;
};

describe("initFromEnv", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses connection string auth by default (no credential)", async () => {
    vi.stubEnv(
      "APPLICATIONINSIGHTS_CONNECTION_STRING",
      BASE_ENV.APPLICATIONINSIGHTS_CONNECTION_STRING,
    );

    const { initFromEnv } = await import("../start-from-env.js");
    initFromEnv();

    expect(useAzureMonitorMock).toHaveBeenCalledOnce();
    const options = getCalledOptions();
    expect(options.azureMonitorExporterOptions?.connectionString).toBe(
      BASE_ENV.APPLICATIONINSIGHTS_CONNECTION_STRING,
    );
    expect(options.azureMonitorExporterOptions).not.toHaveProperty(
      "credential",
    );
  });

  it("uses connection string auth when APPLICATIONINSIGHTS_USE_MANAGED_IDENTITY=false", async () => {
    vi.stubEnv(
      "APPLICATIONINSIGHTS_CONNECTION_STRING",
      BASE_ENV.APPLICATIONINSIGHTS_CONNECTION_STRING,
    );
    vi.stubEnv("APPLICATIONINSIGHTS_USE_MANAGED_IDENTITY", "false");

    const { initFromEnv } = await import("../start-from-env.js");
    initFromEnv();

    const options = getCalledOptions();
    expect(options.azureMonitorExporterOptions).not.toHaveProperty(
      "credential",
    );
  });

  it("uses DefaultAzureCredential when APPLICATIONINSIGHTS_USE_MANAGED_IDENTITY=true", async () => {
    vi.stubEnv(
      "APPLICATIONINSIGHTS_CONNECTION_STRING",
      BASE_ENV.APPLICATIONINSIGHTS_CONNECTION_STRING,
    );
    vi.stubEnv("APPLICATIONINSIGHTS_USE_MANAGED_IDENTITY", "true");

    const { initFromEnv } = await import("../start-from-env.js");
    initFromEnv();

    expect(useAzureMonitorMock).toHaveBeenCalledOnce();
    const options = getCalledOptions();
    expect(options.azureMonitorExporterOptions?.connectionString).toBe(
      BASE_ENV.APPLICATIONINSIGHTS_CONNECTION_STRING,
    );
    expect(options.azureMonitorExporterOptions?.credential).toBeInstanceOf(
      DefaultAzureCredential,
    );
  });

  it("passes sampling ratio and disables rate limiter", async () => {
    vi.stubEnv(
      "APPLICATIONINSIGHTS_CONNECTION_STRING",
      BASE_ENV.APPLICATIONINSIGHTS_CONNECTION_STRING,
    );
    vi.stubEnv("APPINSIGHTS_SAMPLING_PERCENTAGE", "10");

    const { initFromEnv } = await import("../start-from-env.js");
    initFromEnv();

    const options = getCalledOptions();
    expect(options.samplingRatio).toBe(0.1);
    expect(options.tracesPerSecond).toBe(0);
  });
});
