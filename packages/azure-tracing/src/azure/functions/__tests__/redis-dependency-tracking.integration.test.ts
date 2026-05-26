/**
 * Integration suite for Redis dependency tracking through the preload
 * entrypoint.
 */
import { GenericContainer, Wait } from "testcontainers";
import { expect, test } from "vitest";

import {
  createRunId,
  dependencyTestTimeoutMs,
  runDependencyScenario,
  startTelemetryCollector,
} from "./dependency-tracking-test-helpers";

test(
  "exports Redis dependency telemetry from the preload entrypoint",
  async () => {
    const telemetryCollector = await startTelemetryCollector();
    const runId = createRunId();
    const redisKey = `key:${runId}`;
    const redisValue = `value:${runId}`;

    const redisContainer = await new GenericContainer("redis:7.4-alpine")
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forListeningPorts())
      .start();

    try {
      const redisPort = redisContainer.getMappedPort(6379);

      await runDependencyScenario(
        "redis",
        {
          APPINSIGHTS_SAMPLING_PERCENTAGE: "100",
          APPLICATIONINSIGHTS_CONNECTION_STRING:
            telemetryCollector.connectionString,
          APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED: "false",
          APPLICATIONINSIGHTS_SDKSTATS_DISABLED: "true",
          REDIS_KEY: redisKey,
          REDIS_URL: `redis://${redisContainer.getHost()}:${redisPort}`,
          REDIS_VALUE: redisValue,
        },
        telemetryCollector.caCertificatePath,
      );

      const dependencies = await telemetryCollector.waitForRemoteDependencies(
        (dependency) =>
          dependency.type === "redis" &&
          [dependency.data, dependency.name]
            .filter((value) => value !== undefined)
            .some(
              (value) =>
                value?.includes(redisKey) === true ||
                value?.toUpperCase().includes("SET") === true ||
                value?.toUpperCase().includes("GET") === true,
            ),
      );

      expect(dependencies.length).toBeGreaterThanOrEqual(2);
    } finally {
      await Promise.all([redisContainer.stop(), telemetryCollector.close()]);
    }
  },
  dependencyTestTimeoutMs,
);
