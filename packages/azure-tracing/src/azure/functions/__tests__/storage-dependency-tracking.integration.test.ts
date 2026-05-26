/**
 * Integration suite for Blob Storage dependency tracking through the preload
 * entrypoint.
 */
import { GenericContainer, Wait } from "testcontainers";
import { expect, test } from "vitest";

import {
  createRunId,
  createStorageConnectionString,
  dependencyTestTimeoutMs,
  runDependencyScenario,
  startTelemetryCollector,
} from "./dependency-tracking-test-helpers";

test(
  "exports Blob Storage dependency telemetry from the preload entrypoint",
  async () => {
    const telemetryCollector = await startTelemetryCollector();
    const runId = createRunId();
    const containerName = `container-${runId}`;
    const blobName = `blob-${runId}.txt`;

    const storageContainer = await new GenericContainer(
      "mcr.microsoft.com/azure-storage/azurite:3.35.0",
    )
      .withCommand([
        "azurite-blob",
        "--blobHost",
        "0.0.0.0",
        "--blobPort",
        "10000",
        "--loose",
        "--skipApiVersionCheck",
      ])
      .withExposedPorts(10000)
      .withWaitStrategy(Wait.forListeningPorts())
      .start();

    try {
      const blobPort = storageContainer.getMappedPort(10000);

      await runDependencyScenario(
        "storage",
        {
          APPINSIGHTS_SAMPLING_PERCENTAGE: "100",
          APPLICATIONINSIGHTS_CONNECTION_STRING:
            telemetryCollector.connectionString,
          APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED: "false",
          APPLICATIONINSIGHTS_SDKSTATS_DISABLED: "true",
          STORAGE_BLOB_NAME: blobName,
          STORAGE_CONNECTION_STRING: createStorageConnectionString(
            storageContainer.getHost(),
            blobPort,
          ),
          STORAGE_CONTAINER_NAME: containerName,
        },
        telemetryCollector.caCertificatePath,
      );

      const dependencies = await telemetryCollector.waitForRemoteDependencies(
        (dependency) =>
          dependency.target?.includes(`:${blobPort}`) === true &&
          [dependency.data, dependency.name]
            .filter((value) => value !== undefined)
            .some(
              (value) =>
                value?.includes(containerName) === true ||
                value?.includes(blobName) === true,
            ),
      );

      expect(dependencies.length).toBeGreaterThan(0);
    } finally {
      await Promise.all([storageContainer.stop(), telemetryCollector.close()]);
    }
  },
  dependencyTestTimeoutMs,
);
