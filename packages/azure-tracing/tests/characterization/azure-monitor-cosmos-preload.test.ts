/**
 * Freeze Cosmos dependency export through the package preload entrypoint.
 */
/* eslint-disable vitest/no-standalone-expect -- backendTest wraps Vitest's extended test function */
import { describe, expect } from "vitest";

import {
  readScenarioCassette,
  writeScenarioCassette,
} from "../support/cassettes.js";
import { runScenario } from "../support/run-scenario.js";
import { normalizeTelemetry } from "../support/telemetry.js";
import { backendTest } from "../with-test-fixtures.js";

const cassetteMode = process.env.AZURE_TRACING_CASSETTE_MODE ?? "verify";
const cassetteName = "cosmos-preload-dependency-export";
const containerId = "items";
const databaseIdPlaceholder = "<cosmos-database-id>";
const preloadNodeArgs = ["--import", "@pagopa/azure-tracing"] as const;

const applyStringReplacements = (
  value: string,
  replacements: readonly (readonly [string, string])[],
) =>
  replacements
    .filter(([needle]) => needle.length > 0)
    .sort(([left], [right]) => right.length - left.length)
    .reduce(
      (current, [needle, replacement]) =>
        current.split(needle).join(replacement),
      value,
    );

const normalizeScenarioValue = (
  value: unknown,
  replacements: readonly (readonly [string, string])[],
): unknown => {
  if (typeof value === "string") {
    return applyStringReplacements(value, replacements);
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeScenarioValue(item, replacements));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        normalizeScenarioValue(nestedValue, replacements),
      ]),
    );
  }

  return value;
};

const normalizeCosmosDependencyTelemetry = (
  items: Parameters<typeof normalizeTelemetry>[0],
  replacements: readonly (readonly [string, string])[],
) =>
  normalizeTelemetry(items, replacements)
    .filter(
      (item) =>
        item.dependencyType === "Http" &&
        item.data?.startsWith("http://<cosmos-emulator>/dbs") === true,
    )
    .map((item) => {
      const {
        dependencyName,
        operationId,
        operationParentId,
        ...telemetryItem
      } = item;
      void operationId;
      void operationParentId;

      return {
        ...telemetryItem,
        ...(dependencyName
          ? {
              dependencyName: applyStringReplacements(
                dependencyName,
                replacements,
              ),
            }
          : {}),
      };
    })
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    );

describe("Azure Monitor Cosmos preload characterization", () => {
  backendTest(
    cassetteName,
    async ({ backendStub, cosmosDatabaseId, replacements, scenarioEnv }) => {
      const scenarioReplacements = [
        ...replacements,
        [cosmosDatabaseId, databaseIdPlaceholder],
      ] as const;
      const response = await runScenario({
        env: {
          ...scenarioEnv,
          APPINSIGHTS_SAMPLING_PERCENTAGE: "100",
          APPLICATIONINSIGHTS_CONNECTION_STRING:
            scenarioEnv.AZURE_TRACING_TEST_CONNECTION_STRING,
          AZURE_TRACING_TEST_COSMOS_CONTAINER_ID: containerId,
          AZURE_TRACING_TEST_COSMOS_DATABASE_ID: cosmosDatabaseId,
          AZURE_TRACING_TEST_EXPORT_DELAY_MS: "1000",
        },
        nodeArgs: preloadNodeArgs,
        scenario: "integration-cosmos-preload",
      });

      expect(response).toMatchObject({
        containerId,
        databaseId: cosmosDatabaseId,
        queryCount: 1,
        scenario: "integration-cosmos-preload",
      });

      const telemetry = await backendStub.waitForTelemetry((items) => {
        const normalizedItems = normalizeCosmosDependencyTelemetry(
          items,
          scenarioReplacements,
        );

        return (
          normalizedItems.some(
            (item) =>
              item.data === "http://<cosmos-emulator>/dbs" &&
              item.dependencyName === "POST /dbs",
          ) &&
          normalizedItems.some(
            (item) =>
              item.data ===
                `http://<cosmos-emulator>/dbs/${databaseIdPlaceholder}/colls/${containerId}/docs` &&
              item.dependencyName ===
                `POST /dbs/${databaseIdPlaceholder}/colls/${containerId}/docs`,
          ) &&
          normalizedItems.some(
            (item) =>
              item.data ===
                `http://<cosmos-emulator>/dbs/${databaseIdPlaceholder}` &&
              item.dependencyName === `DELETE /dbs/${databaseIdPlaceholder}`,
          )
        );
      });

      const cosmosTelemetry = normalizeCosmosDependencyTelemetry(
        telemetry,
        scenarioReplacements,
      );

      expect(cosmosTelemetry).toEqual(
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
            data: `http://<cosmos-emulator>/dbs/${databaseIdPlaceholder}/colls/${containerId}/docs`,
            dependencyName: `POST /dbs/${databaseIdPlaceholder}/colls/${containerId}/docs`,
            dependencyType: "Http",
            resultCode: "200",
            success: true,
            telemetryType: "dependency",
          }),
          expect.objectContaining({
            data: `http://<cosmos-emulator>/dbs/${databaseIdPlaceholder}`,
            dependencyName: `DELETE /dbs/${databaseIdPlaceholder}`,
            dependencyType: "Http",
            resultCode: "204",
            success: true,
            telemetryType: "dependency",
          }),
        ]),
      );

      const cassette = {
        normalization: {
          ignoredFields: [
            "time",
            "id",
            "duration",
            "ai.cloud.role",
            "ai.cloud.roleInstance",
            "ai.internal.sdkVersion",
            "operationId",
            "operationParentId",
          ],
          placeholders: {
            azureMonitorStub: "https://<azure-monitor-stub>",
            cosmosDatabaseId: databaseIdPlaceholder,
            cosmosEmulator: "http://<cosmos-emulator>",
          },
        },
        request: normalizeScenarioValue(
          {
            containerId,
            databaseId: cosmosDatabaseId,
            nodeArgs: preloadNodeArgs,
            scenario: "integration-cosmos-preload",
          },
          scenarioReplacements,
        ),
        response: normalizeScenarioValue(response, scenarioReplacements),
        sideEffects: {
          telemetry: cosmosTelemetry,
        },
        topology: {
          boundary: "@pagopa/azure-tracing",
          cosmosEndpoint: "http://<cosmos-emulator>",
          dependencyClient: "@azure/cosmos",
          ingestionEndpoint: "https://<azure-monitor-stub>",
          path: "record-replay",
          runtime: "node --import @pagopa/azure-tracing",
        },
      };

      if (cassetteMode === "record") {
        await writeScenarioCassette(cassetteName, cassette);
      }

      expect(cassette).toStrictEqual(await readScenarioCassette(cassetteName));
    },
  );
});
