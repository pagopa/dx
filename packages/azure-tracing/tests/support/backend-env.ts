/**
 * Shared constants and env helpers for azure-tracing backend test workflows.
 */
export const cosmosEmulatorKey =
  "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==";

export const telemetryInstrumentationKey =
  "00000000-0000-0000-0000-000000000000";

export const buildAzureMonitorConnectionString = (ingestionEndpoint: string) =>
  `InstrumentationKey=${telemetryInstrumentationKey};IngestionEndpoint=${ingestionEndpoint}`;

export const requiredEnv = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required backend test environment variable: ${name}`);
  }

  return value;
};
