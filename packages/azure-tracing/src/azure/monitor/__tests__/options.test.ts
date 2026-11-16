/**
 * Tests for options.ts — the resolver layers the caller's overrides on top of
 * the environment-derived defaults instead of replacing them.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@azure/monitor-opentelemetry", () => ({
  useAzureMonitor: vi.fn(),
}));

// Mock @azure/identity so we can assert the DefaultAzureCredential instance survives the merge
vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: vi.fn(function DefaultAzureCredential() {
    return {
      getToken: vi.fn(),
    };
  }),
}));

describe("resolveAzureMonitorOptions", () => {
  const ENV_CONNECTION_STRING = "InstrumentationKey=env-key";

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  const loadResolver = async () => {
    const [{ resolveAzureMonitorOptions }, { loadEnv }] = await Promise.all([
      import("../options.js"),
      import("../env.js"),
    ]);

    return (overrides?: Parameters<typeof resolveAzureMonitorOptions>[1]) =>
      resolveAzureMonitorOptions(loadEnv(), overrides);
  };

  it("returns the environment-derived defaults when no override is given", async () => {
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", ENV_CONNECTION_STRING);
    vi.stubEnv("APPINSIGHTS_SAMPLING_PERCENTAGE", "10");
    const resolveAzureMonitorOptions = await loadResolver();

    const options = resolveAzureMonitorOptions();

    expect(options.azureMonitorExporterOptions?.connectionString).toBe(
      ENV_CONNECTION_STRING,
    );
    expect(options.azureMonitorExporterOptions?.credential).toBeUndefined();
    expect(options.enableLiveMetrics).toBe(true);
    expect(options.samplingRatio).toBeCloseTo(0.1);
    expect(options.tracesPerSecond).toBe(0);
  });

  it("keeps the environment defaults the override does not mention", async () => {
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", ENV_CONNECTION_STRING);
    const resolveAzureMonitorOptions = await loadResolver();

    const options = resolveAzureMonitorOptions({ enableLiveMetrics: false });

    expect(options.enableLiveMetrics).toBe(false);
    expect(options.tracesPerSecond).toBe(0);
    expect(options.samplingRatio).toBeCloseTo(0.05);
    expect(options.azureMonitorExporterOptions?.connectionString).toBe(
      ENV_CONNECTION_STRING,
    );
  });

  it("merges nested exporter options instead of replacing them", async () => {
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", ENV_CONNECTION_STRING);
    const resolveAzureMonitorOptions = await loadResolver();

    const options = resolveAzureMonitorOptions({
      azureMonitorExporterOptions: { disableOfflineStorage: true },
    });

    expect(options.azureMonitorExporterOptions?.connectionString).toBe(
      ENV_CONNECTION_STRING,
    );
    expect(options.azureMonitorExporterOptions?.disableOfflineStorage).toBe(
      true,
    );
  });

  it("keeps the Entra ID credential while merging other exporter options", async () => {
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", ENV_CONNECTION_STRING);
    vi.stubEnv("APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED", "true");
    const resolveAzureMonitorOptions = await loadResolver();

    const options = resolveAzureMonitorOptions({
      azureMonitorExporterOptions: { disableOfflineStorage: true },
    });

    expect(options.azureMonitorExporterOptions?.credential).toBeDefined();
    expect(options.azureMonitorExporterOptions?.disableOfflineStorage).toBe(
      true,
    );
  });

  it("accepts the connection string from the override when the env var is missing", async () => {
    const resolveAzureMonitorOptions = await loadResolver();

    const options = resolveAzureMonitorOptions({
      azureMonitorExporterOptions: { connectionString: ENV_CONNECTION_STRING },
    });

    expect(options.azureMonitorExporterOptions?.connectionString).toBe(
      ENV_CONNECTION_STRING,
    );
    expect(options.enableLiveMetrics).toBe(true);
  });

  it("does not let an explicitly undefined property shadow the environment default", async () => {
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", ENV_CONNECTION_STRING);
    const resolveAzureMonitorOptions = await loadResolver();

    const options = resolveAzureMonitorOptions({
      azureMonitorExporterOptions: { connectionString: undefined },
      samplingRatio: undefined,
    });

    expect(options.azureMonitorExporterOptions?.connectionString).toBe(
      ENV_CONNECTION_STRING,
    );
    expect(options.samplingRatio).toBeCloseTo(0.05);
  });

  it("drops undefined members of a group without an environment baseline", async () => {
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", ENV_CONNECTION_STRING);
    const resolveAzureMonitorOptions = await loadResolver();

    const options = resolveAzureMonitorOptions({
      browserSdkLoaderOptions: { connectionString: undefined },
      instrumentationOptions: { http: undefined },
    });

    // An undefined member would otherwise replace the SDK default
    // (`http: { enabled: true }`), silently disabling the instrumentation.
    expect(options.instrumentationOptions).toStrictEqual({});
    expect(options.browserSdkLoaderOptions).toStrictEqual({});
  });

  it("replaces array options with the given ones", async () => {
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", ENV_CONNECTION_STRING);
    const resolveAzureMonitorOptions = await loadResolver();
    const processor = {
      forceFlush: vi.fn(),
      onEmit: vi.fn(),
      shutdown: vi.fn(),
    };

    const options = resolveAzureMonitorOptions({
      logRecordProcessors: [processor],
    });

    expect(options.logRecordProcessors).toStrictEqual([processor]);
  });

  it("throws when neither the environment nor the override provide a connection string", async () => {
    const resolveAzureMonitorOptions = await loadResolver();

    expect(() => resolveAzureMonitorOptions()).toThrow(/connection string/i);
  });
});
