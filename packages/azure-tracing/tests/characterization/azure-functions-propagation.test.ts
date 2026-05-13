/**
 * Freeze Azure Functions trace-context propagation through the public package exports.
 */
import { describe, expect } from "vitest";

import {
  readScenarioCassette,
  writeScenarioCassette,
} from "../support/cassettes.js";
import { runScenario } from "../support/run-scenario.js";
import { normalizeTelemetry } from "../support/telemetry.js";
import { backendTest } from "../with-test-fixtures.js";

const cassetteMode = process.env.AZURE_TRACING_CASSETTE_MODE ?? "verify";
const traceparent = "00-11111111111111111111111111111111-2222222222222222-01";
const tracestate = "vendor=test";
const [version, traceId, parentSpanId] = traceparent.split("-");

const scenarios = [
  {
    boundary: "@pagopa/azure-tracing/azure-functions/v3",
    cassetteName: "functions-v3-trace-context",
    runnerScenario: "functions-v3",
    spanName: "functions-v3-child",
  },
  {
    boundary: "@pagopa/azure-tracing/azure-functions",
    cassetteName: "functions-v4-trace-context",
    runnerScenario: "functions-v4",
    spanName: "functions-v4-child",
  },
] as const;

describe("Azure Functions trace context characterization", () => {
  for (const scenario of scenarios) {
    backendTest(scenario.cassetteName, async ({ backendStub, replacements, scenarioEnv }) => {
      const response = await runScenario({
        env: {
          ...scenarioEnv,
          AZURE_TRACING_TEST_EXPORT_DELAY_MS: "1000",
          AZURE_TRACING_TEST_TRACEPARENT: traceparent,
          AZURE_TRACING_TEST_TRACESTATE: tracestate,
        },
        scenario: scenario.runnerScenario,
      });

      const telemetry = await backendStub.waitForTelemetry((items) =>
        normalizeTelemetry(items, replacements).some(
          (item) => item.dependencyName === scenario.spanName,
        ),
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
          ],
          placeholders: {
            azureMonitorStub: "https://<azure-monitor-stub>",
          },
        },
        request: {
          scenario: scenario.runnerScenario,
          traceparent,
          tracestate,
          traceparentParts: {
            parentSpanId,
            traceFlags: "01",
            traceId,
            version,
          },
        },
        response,
        sideEffects: {
          telemetry: normalizeTelemetry(telemetry, replacements).filter(
            (item) => item.dependencyName === scenario.spanName,
          ),
        },
        topology: {
          boundary: scenario.boundary,
          ingestionEndpoint: "https://<azure-monitor-stub>",
          path: "record-replay",
          runtime: "direct-initAzureMonitor",
        },
      };

      if (cassetteMode === "record") {
        await writeScenarioCassette(scenario.cassetteName, cassette);
      }

      expect(cassette).toStrictEqual(
        await readScenarioCassette(scenario.cassetteName),
      );
    });
  }
});
