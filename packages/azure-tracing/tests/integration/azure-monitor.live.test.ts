/**
 * Live backend coverage for the Azure Monitor boundary exposed by azure-tracing.
 */
import { describe, expect } from "vitest";

import { runScenario } from "../support/run-scenario.js";
import { normalizeTelemetry } from "../support/telemetry.js";
import { backendTest } from "../with-test-fixtures.js";

const getTraceparentHeader = (
  value: readonly string[] | string | undefined,
) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

describe("azure-tracing live integration", () => {
  backendTest(
    "exports HTTP, Redis, and custom events through initAzureMonitor",
    async ({ backendStub, redisNamespace, replacements, scenarioEnv }) => {
      const summary = await runScenario({
        env: {
          ...scenarioEnv,
          AZURE_TRACING_TEST_EXPORT_DELAY_MS: "2000",
          AZURE_TRACING_TEST_REDIS_NAMESPACE: redisNamespace,
        },
        scenario: "integration-live",
      });

      expect(summary).toMatchObject({
        redisValue: "integration-value",
        scenario: "integration-live",
      });

      const telemetry = await backendStub.waitForTelemetry((items) => {
        const normalizedItems = normalizeTelemetry(items, replacements);

        return (
          normalizedItems.some(
            (item) => item.dependencyName === "GET /outbound/ping",
          ) &&
          normalizedItems.some((item) => item.dependencyName === "redis-SET") &&
          normalizedItems.some(
            (item) => item.eventName === "integration-live-event",
          )
        );
      });

      const normalizedItems = normalizeTelemetry(telemetry, replacements);

      expect(normalizedItems).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            data: "https://<azure-monitor-stub>/outbound/ping",
            dependencyName: "GET /outbound/ping",
            dependencyType: "Http",
            resultCode: "200",
            success: true,
            telemetryType: "dependency",
          }),
          expect.objectContaining({
            dependencyName: "redis-SET",
            dependencyType: "redis",
            resultCode: "0",
            success: true,
            telemetryType: "dependency",
          }),
          expect.objectContaining({
            dependencyName: "redis-GET",
            dependencyType: "redis",
            resultCode: "0",
            success: true,
            telemetryType: "dependency",
          }),
          expect.objectContaining({
            eventName: "integration-live-event",
            properties: {
              component: "azure-tracing-tests",
            },
            telemetryType: "event",
          }),
        ]),
      );

      const outboundRequests = await backendStub.listOutboundRequests();
      const traceparent = getTraceparentHeader(
        outboundRequests[0]?.headers.traceparent,
      );

      expect(outboundRequests).toHaveLength(1);
      expect(traceparent).toMatch(/^00-/u);
    },
  );

  backendTest(
    "exports Cosmos dependency telemetry when preloaded through the package import hook",
    async ({ backendStub, cosmosDatabaseId, replacements, scenarioEnv }) => {
      const containerId = "items";
      const summary = await runScenario({
        env: {
          ...scenarioEnv,
          APPLICATIONINSIGHTS_CONNECTION_STRING:
            scenarioEnv.AZURE_TRACING_TEST_CONNECTION_STRING,
          APPINSIGHTS_SAMPLING_PERCENTAGE: "100",
          AZURE_TRACING_TEST_COSMOS_CONTAINER_ID: containerId,
          AZURE_TRACING_TEST_COSMOS_DATABASE_ID: cosmosDatabaseId,
          AZURE_TRACING_TEST_EXPORT_DELAY_MS: "1000",
        },
        nodeArgs: ["--import", "@pagopa/azure-tracing"],
        scenario: "integration-cosmos-preload",
      });

      expect(summary).toMatchObject({
        containerId,
        databaseId: cosmosDatabaseId,
        queryCount: 1,
        scenario: "integration-cosmos-preload",
      });

      const telemetry = await backendStub.waitForTelemetry((items) =>
        normalizeTelemetry(items, replacements).some(
          (item) =>
            item.dependencyType === "Http" &&
            item.data?.startsWith("http://<cosmos-emulator>/dbs") === true,
        ),
      );

      const normalizedItems = normalizeTelemetry(telemetry, replacements);

      expect(normalizedItems).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            data: "http://<cosmos-emulator>/dbs",
            dependencyName: "POST /dbs",
            dependencyType: "Http",
            resultCode: "201",
            success: true,
            telemetryType: "dependency",
          }),
          expect.objectContaining({
            data: `http://<cosmos-emulator>/dbs/${cosmosDatabaseId}/colls/${containerId}/docs`,
            dependencyName: `POST /dbs/${cosmosDatabaseId}/colls/${containerId}/docs`,
            dependencyType: "Http",
            resultCode: "200",
            success: true,
            telemetryType: "dependency",
          }),
          expect.objectContaining({
            data: `http://<cosmos-emulator>/dbs/${cosmosDatabaseId}`,
            dependencyName: `DELETE /dbs/${cosmosDatabaseId}`,
            dependencyType: "Http",
            resultCode: "204",
            success: true,
            telemetryType: "dependency",
          }),
        ]),
      );
    },
  );
});
