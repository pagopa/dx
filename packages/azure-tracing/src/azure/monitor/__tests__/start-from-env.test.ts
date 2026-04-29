/**
 * Tests for start-from-env.ts — validates that initFromEnv() configures Azure Monitor
 * correctly depending on the Entra ID auth env var.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock the Azure Monitor SDK to avoid real telemetry setup in tests
vi.mock("@azure/monitor-opentelemetry", () => ({
  useAzureMonitor: vi.fn(),
}));

// Mock @azure/identity so we can assert DefaultAzureCredential is used
vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: vi.fn().mockImplementation(() => ({
    getToken: vi.fn(),
  })),
}));

describe("initFromEnv", () => {
  const CONNECTION_STRING = "InstrumentationKey=test-key";

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("calls useAzureMonitor WITHOUT credential when Entra ID auth is not enabled (default)", async () => {
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", CONNECTION_STRING);

    const { useAzureMonitor } = await import("@azure/monitor-opentelemetry");
    const { initFromEnv } = await import("../start-from-env.js");

    initFromEnv();

    expect(useAzureMonitor).toHaveBeenCalledOnce();
    const calledOptions = vi.mocked(useAzureMonitor).mock.calls[0]?.[0];
    expect(
      calledOptions?.azureMonitorExporterOptions?.credential,
    ).toBeUndefined();
    expect(calledOptions?.azureMonitorExporterOptions?.connectionString).toBe(
      CONNECTION_STRING,
    );
  });

  it("calls useAzureMonitor WITH DefaultAzureCredential when Entra ID auth is enabled", async () => {
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", CONNECTION_STRING);
    vi.stubEnv("APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED", "true");

    const { DefaultAzureCredential } = await import("@azure/identity");
    const { useAzureMonitor } = await import("@azure/monitor-opentelemetry");
    const { initFromEnv } = await import("../start-from-env.js");

    initFromEnv();

    expect(DefaultAzureCredential).toHaveBeenCalledOnce();
    expect(useAzureMonitor).toHaveBeenCalledOnce();
    const calledOptions = vi.mocked(useAzureMonitor).mock.calls[0]?.[0];
    expect(
      calledOptions?.azureMonitorExporterOptions?.credential,
    ).toBeDefined();
    expect(calledOptions?.azureMonitorExporterOptions?.connectionString).toBe(
      CONNECTION_STRING,
    );
  });

  it("passes samplingRatio and tracesPerSecond when Entra ID auth is not enabled", async () => {
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", CONNECTION_STRING);
    vi.stubEnv("APPINSIGHTS_SAMPLING_PERCENTAGE", "10");

    const { useAzureMonitor } = await import("@azure/monitor-opentelemetry");
    const { initFromEnv } = await import("../start-from-env.js");

    initFromEnv();

    const calledOptions = vi.mocked(useAzureMonitor).mock.calls[0]?.[0];
    expect(calledOptions?.samplingRatio).toBeCloseTo(0.1);
    expect(calledOptions?.tracesPerSecond).toBe(0);
  });

  it("passes samplingRatio and tracesPerSecond when Entra ID auth is enabled", async () => {
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", CONNECTION_STRING);
    vi.stubEnv("APPINSIGHTS_SAMPLING_PERCENTAGE", "10");
    vi.stubEnv("APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED", "true");

    const { useAzureMonitor } = await import("@azure/monitor-opentelemetry");
    const { initFromEnv } = await import("../start-from-env.js");

    initFromEnv();

    const calledOptions = vi.mocked(useAzureMonitor).mock.calls[0]?.[0];
    expect(calledOptions?.samplingRatio).toBeCloseTo(0.1);
    expect(calledOptions?.tracesPerSecond).toBe(0);
  });
});
