/**
 * Tests for index.ts — initAzureMonitor resolves the environment defaults,
 * layers the caller overrides on top of them and hands the result to the
 * Azure Monitor SDK.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@azure/monitor-opentelemetry", () => ({
  useAzureMonitor: vi.fn(),
}));

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: vi.fn(function DefaultAzureCredential() {
    return {
      getToken: vi.fn(),
    };
  }),
}));

describe("initAzureMonitor", () => {
  const CONNECTION_STRING = "InstrumentationKey=env-key";

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  const loadInitAzureMonitor = async () => {
    const { initAzureMonitor } = await import("../index.js");

    return initAzureMonitor;
  };

  const readCalledOptions = async () => {
    const { useAzureMonitor } = await import("@azure/monitor-opentelemetry");

    return vi.mocked(useAzureMonitor).mock.calls[0]?.[0];
  };

  it("initializes Azure Monitor from the environment when no override is given", async () => {
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", CONNECTION_STRING);
    const initAzureMonitor = await loadInitAzureMonitor();

    initAzureMonitor();

    const calledOptions = await readCalledOptions();
    expect(calledOptions?.azureMonitorExporterOptions?.connectionString).toBe(
      CONNECTION_STRING,
    );
    expect(calledOptions?.enableLiveMetrics).toBe(true);
  });

  it("merges the override over the environment defaults", async () => {
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", CONNECTION_STRING);
    const initAzureMonitor = await loadInitAzureMonitor();

    initAzureMonitor([], { samplingRatio: 0.5 });

    const calledOptions = await readCalledOptions();
    expect(calledOptions?.samplingRatio).toBeCloseTo(0.5);
    expect(calledOptions?.azureMonitorExporterOptions?.connectionString).toBe(
      CONNECTION_STRING,
    );
    expect(calledOptions?.tracesPerSecond).toBe(0);
  });

  it("surfaces the missing connection string error", async () => {
    const initAzureMonitor = await loadInitAzureMonitor();

    expect(() => initAzureMonitor()).toThrow(/connection string/i);
  });
});
