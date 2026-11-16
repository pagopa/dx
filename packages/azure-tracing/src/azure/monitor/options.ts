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

import type { AzureTracingEnv } from "./env.js";

/**
 * The subset of `AzureMonitorOpenTelemetryOptions` a caller may override.
 *
 * Every property is optional: anything left out keeps the value derived from
 * the environment (or the SDK default when the environment does not set one).
 */
export type AzureMonitorOptionsOverride =
  Partial<AzureMonitorOpenTelemetryOptions>;

const optionsFromEnv = (
  env: AzureTracingEnv,
): AzureMonitorOpenTelemetryOptions => ({
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
 * Drops the own properties whose value is `undefined`, so that a caller
 * writing `{ samplingRatio: maybeUndefined }` does not shadow a default.
 */
const withoutUndefined = <T extends object>(value: T | undefined): Partial<T> =>
  Object.fromEntries(
    Object.entries(value ?? {}).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;

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

  return { ...defaults, ...withoutUndefined(override) };
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
    ...withoutUndefined(override),
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
 *
 * @param env - The environment parsed by `loadEnv`.
 * @param overrides - The properties the caller wants to override.
 */
export const resolveAzureMonitorOptions = (
  env: AzureTracingEnv,
  overrides: AzureMonitorOptionsOverride = {},
): AzureMonitorOpenTelemetryOptions => {
  const options = mergeAzureMonitorOptions(optionsFromEnv(env), overrides);

  assertConnectionString(options);

  return options;
};
