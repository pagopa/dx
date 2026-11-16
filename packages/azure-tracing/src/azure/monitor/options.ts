/**
 * Resolves the options handed to `useAzureMonitor`.
 *
 * The package always derives a baseline configuration from the environment and
 * layers the caller's overrides on top of it, so that passing a single option
 * (for example a custom connection string) does not silently drop the
 * environment-derived defaults such as sampling, live metrics or the Entra ID
 * credential.
 */
import type { AzureMonitorOpenTelemetryOptions } from "@azure/monitor-opentelemetry";

import { DefaultAzureCredential } from "@azure/identity";

import { loadEnv } from "./env.js";

/**
 * The subset of `AzureMonitorOpenTelemetryOptions` a caller may override.
 *
 * Every property is optional: anything left out keeps the value derived from
 * the environment (or the SDK default when the environment does not set one).
 */
export type AzureMonitorOptionsOverride =
  Partial<AzureMonitorOpenTelemetryOptions>;

type LoadedEnv = ReturnType<typeof loadEnv>;

const optionsFromEnv = (env: LoadedEnv): AzureMonitorOpenTelemetryOptions => ({
  azureMonitorExporterOptions: {
    connectionString: env.APPLICATIONINSIGHTS_CONNECTION_STRING,
    ...(env.APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED
      ? {
          // Entra ID (Managed Identity) authentication via DefaultAzureCredential.
          // DefaultAzureCredential tries multiple credential providers in order:
          // Managed Identity in production, Azure CLI / service principal for local dev.
          credential: new DefaultAzureCredential(),
        }
      : {}),
  },
  enableLiveMetrics: true,
  samplingRatio: env.APPINSIGHTS_SAMPLING_PERCENTAGE,
  // Disable rate limiter introduced in @azure/monitor-opentelemetry@1.16.0
  // (default: 5 req/s). A value of 0 means no limit.
  tracesPerSecond: 0,
});

/**
 * Shallow-merges two optional option groups: the override wins key by key,
 * leaving the defaults it does not mention untouched.
 */
const mergeOptionGroup = <T extends object>(
  defaults: T | undefined,
  override: T | undefined,
): T | undefined => {
  if (defaults === undefined) {
    return override;
  }

  if (override === undefined) {
    return defaults;
  }

  return { ...defaults, ...override };
};

const mergeAzureMonitorOptions = (
  defaults: AzureMonitorOpenTelemetryOptions,
  override: AzureMonitorOptionsOverride,
): AzureMonitorOpenTelemetryOptions => {
  const azureMonitorExporterOptions = mergeOptionGroup(
    defaults.azureMonitorExporterOptions,
    override.azureMonitorExporterOptions,
  );
  const instrumentationOptions = mergeOptionGroup(
    defaults.instrumentationOptions,
    override.instrumentationOptions,
  );
  const browserSdkLoaderOptions = mergeOptionGroup(
    defaults.browserSdkLoaderOptions,
    override.browserSdkLoaderOptions,
  );

  return {
    ...defaults,
    ...override,
    // Nested option groups are merged instead of being replaced wholesale.
    // Arrays and class instances (Resource, TokenCredential, ...) are replaced.
    ...(azureMonitorExporterOptions === undefined
      ? {}
      : { azureMonitorExporterOptions }),
    ...(instrumentationOptions === undefined ? {} : { instrumentationOptions }),
    ...(browserSdkLoaderOptions === undefined
      ? {}
      : { browserSdkLoaderOptions }),
  };
};

/**
 * Fails fast when no connection string can be resolved: the environment
 * variable is optional only because it may be supplied by the caller.
 */
const assertConnectionString = (options: AzureMonitorOpenTelemetryOptions) => {
  if (!options.azureMonitorExporterOptions?.connectionString) {
    throw new Error(
      "Missing Application Insights connection string: set the APPLICATIONINSIGHTS_CONNECTION_STRING environment variable or provide azureMonitorExporterOptions.connectionString.",
    );
  }
};

/**
 * Builds the effective Azure Monitor options: environment defaults with the
 * caller overrides applied on top.
 */
export const resolveAzureMonitorOptions = (
  override: AzureMonitorOptionsOverride = {},
): AzureMonitorOpenTelemetryOptions => {
  const options = mergeAzureMonitorOptions(optionsFromEnv(loadEnv()), override);

  assertConnectionString(options);

  return options;
};
