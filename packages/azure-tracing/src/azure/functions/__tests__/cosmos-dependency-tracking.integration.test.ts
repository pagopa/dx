/**
 * Integration suite for Cosmos DB dependency tracking through the preload
 * entrypoint.
 */
import { GenericContainer, Wait } from "testcontainers";
import { expect, test } from "vitest";

import {
  cosmosEmulatorKey,
  createRunId,
  dependencyTestTimeoutMs,
  runDependencyScenario,
  startTelemetryCollector,
} from "./dependency-tracking-test-helpers";

test(
  "exports Cosmos DB dependency telemetry from the preload entrypoint",
  async () => {
    const telemetryCollector = await startTelemetryCollector();
    const runId = createRunId();
    const databaseId = `db-${runId}`;
    const containerId = `container-${runId}`;
    const itemId = `item-${runId}`;

    const cosmosContainer = await new GenericContainer(
      "mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:vnext-preview@sha256:4496011376a190b4b70bb56596bfcb51e2a1d0b5c071d8b1a1daf8188f5350ab",
    )
      .withEnvironment({
        ENABLE_EXPLORER: "false",
        GATEWAY_PUBLIC_ENDPOINT: "127.0.0.1",
        LOG_LEVEL: "warn",
        PROTOCOL: "http",
      })
      .withExposedPorts(8080, 8081)
      .withStartupTimeout(240_000)
      .withWaitStrategy(Wait.forHttp("/ready", 8080).forStatusCode(200))
      .start();

    try {
      const cosmosPort = cosmosContainer.getMappedPort(8081);

      await runDependencyScenario(
        "cosmos",
        {
          APPINSIGHTS_SAMPLING_PERCENTAGE: "100",
          APPLICATIONINSIGHTS_CONNECTION_STRING:
            telemetryCollector.connectionString,
          APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED: "false",
          APPLICATIONINSIGHTS_SDKSTATS_DISABLED: "true",
          COSMOS_CONTAINER_ID: containerId,
          COSMOS_DATABASE_ID: databaseId,
          COSMOS_ENDPOINT: `http://${cosmosContainer.getHost()}:${cosmosPort}`,
          COSMOS_ITEM_ID: itemId,
          COSMOS_KEY: cosmosEmulatorKey,
        },
        telemetryCollector.caCertificatePath,
      );

      const dependencies = await telemetryCollector.waitForRemoteDependencies(
        (dependency) =>
          [dependency.data, dependency.name, dependency.target]
            .filter((value) => value !== undefined)
            .some((value) => value?.includes(`:${cosmosPort}`) === true) &&
          [dependency.data, dependency.name]
            .filter((value) => value !== undefined)
            .some(
              (value) =>
                value?.includes(databaseId) === true ||
                value?.includes(containerId) === true ||
                value?.includes(itemId) === true,
            ),
      );

      expect(dependencies.length).toBeGreaterThan(0);
    } finally {
      await Promise.all([cosmosContainer.stop(), telemetryCollector.close()]);
    }
  },
  dependencyTestTimeoutMs,
);
