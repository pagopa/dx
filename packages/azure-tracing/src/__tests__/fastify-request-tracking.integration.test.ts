/**
 * Integration smoke test for Fastify request tracking on standalone
 * applications (Container Apps, App Services). It proves that a server
 * instrumented through the public `@pagopa/azure-tracing/azure-monitor`
 * entrypoint exports Azure Monitor request telemetry carrying the requested
 * URL, and that Live Metrics completes its subscription handshake against the
 * Live Metrics endpoint.
 */
import { test as baseTest, expect } from "vitest";

import {
  type DependencyTrackingFixtures,
  telemetryCollectorFixture,
} from "./dependency-tracking-test-fixtures";
import {
  createRunId,
  dependencyTestTimeoutMs,
  runDependencyScenario,
  standalonePreloadModulePath,
} from "./dependency-tracking-test-helpers";

const liveMetricsPaths = {
  ping: "/QuickPulseService.svc/ping",
  post: "/QuickPulseService.svc/post",
};

const test = baseTest.extend<DependencyTrackingFixtures>({
  telemetryCollector: telemetryCollectorFixture,
});

test(
  "exports Fastify request telemetry with a non-empty URL",
  async ({ telemetryCollector }) => {
    const runId = createRunId();
    const requestPath = `/dependency-tracking/${runId}`;

    await runDependencyScenario(
      "fastify",
      {
        APPINSIGHTS_SAMPLING_PERCENTAGE: "100",
        APPLICATIONINSIGHTS_CONNECTION_STRING:
          telemetryCollector.connectionString,
        APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED: "false",
        APPLICATIONINSIGHTS_SDKSTATS_DISABLED: "true",
        FASTIFY_REQUEST_PATH: requestPath,
        FASTIFY_RUN_ID: runId,
      },
      telemetryCollector.caCertificatePath,
      standalonePreloadModulePath,
    );

    const [requestTelemetry] =
      await telemetryCollector.waitForRequestTelemetries(
        (telemetry) => telemetry.url?.endsWith(requestPath) === true,
      );

    expect(requestTelemetry.url).toContain(requestPath);
    expect(requestTelemetry.responseCode).toBe("200");

    await telemetryCollector.waitForCapturedPath((path) =>
      path.startsWith(liveMetricsPaths.ping),
    );
    await telemetryCollector.waitForCapturedPath((path) =>
      path.startsWith(liveMetricsPaths.post),
    );
  },
  dependencyTestTimeoutMs,
);
