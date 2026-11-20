/**
 * Integration test for the sampling exemptions log record processor. It runs a
 * standalone application that samples no trace, served by the real Azure
 * Monitor distro and the real exporter, and asserts which log records reach the
 * ingestion endpoint.
 */
import { test as baseTest, describe, expect } from "vitest";

import {
  type DependencyTrackingFixtures,
  telemetryCollectorFixture,
} from "./dependency-tracking-test-fixtures";
import {
  createRunId,
  dependencyTestTimeoutMs,
  type LogTelemetry,
  runDependencyScenario,
  samplingExemptionsPreloadModulePath,
  type TelemetryCollector,
} from "./dependency-tracking-test-helpers";

const test = baseTest.extend<DependencyTrackingFixtures>({
  telemetryCollector: telemetryCollectorFixture,
});

interface LogSamplingMarkers {
  readonly errorMessage: string;
  readonly eventBooleanName: string;
  readonly eventStringName: string;
  readonly exceptionMessage: string;
  readonly infoMessage: string;
  readonly outsideSpanMessage: string;
}

const createMarkers = (runId: string): LogSamplingMarkers => ({
  errorMessage: `log-sampling error ${runId}`,
  eventBooleanName: `log-sampling-exempt-boolean-${runId}`,
  eventStringName: `log-sampling-exempt-string-${runId}`,
  exceptionMessage: `log-sampling exception ${runId}`,
  infoMessage: `log-sampling info ${runId}`,
  outsideSpanMessage: `log-sampling outside span ${runId}`,
});

const markersToEnv = (markers: LogSamplingMarkers) => ({
  LOG_SAMPLING_ERROR_MESSAGE: markers.errorMessage,
  LOG_SAMPLING_EVENT_BOOLEAN_NAME: markers.eventBooleanName,
  LOG_SAMPLING_EVENT_STRING_NAME: markers.eventStringName,
  LOG_SAMPLING_EXCEPTION_MESSAGE: markers.exceptionMessage,
  LOG_SAMPLING_INFO_MESSAGE: markers.infoMessage,
  LOG_SAMPLING_OUTSIDE_SPAN_MESSAGE: markers.outsideSpanMessage,
});

const matchesMessage =
  (message: string) =>
  (telemetry: LogTelemetry): boolean =>
    telemetry.baseData.message === message;

const matchesEvent =
  (name: string) =>
  (telemetry: LogTelemetry): boolean =>
    telemetry.baseType === "EventData" && telemetry.baseData.name === name;

const matchesException =
  (message: string) =>
  (telemetry: LogTelemetry): boolean =>
    telemetry.baseType === "ExceptionData" &&
    telemetry.baseData.exceptions?.some(
      (exception) => exception.message === message,
    ) === true;

const countMatching = (
  telemetryCollector: TelemetryCollector,
  predicate: (telemetry: LogTelemetry) => boolean,
) => telemetryCollector.getLogTelemetries().filter(predicate).length;

/**
 * Samples no trace, so the records emitted inside a span belong to an unsampled
 * trace: the configuration in which the distro drops them.
 */
const runSamplingExemptionsScenario = async (
  enableTraceBasedSamplingForLogs: boolean,
  telemetryCollector: TelemetryCollector,
) => {
  const markers = createMarkers(createRunId());

  await runDependencyScenario(
    "log-sampling",
    {
      APPINSIGHTS_SAMPLING_PERCENTAGE: "0",
      APPLICATIONINSIGHTS_CONNECTION_STRING:
        telemetryCollector.connectionString,
      APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED: "false",
      APPLICATIONINSIGHTS_SDKSTATS_DISABLED: "true",
      ENABLE_TRACE_BASED_SAMPLING_FOR_LOGS: String(
        enableTraceBasedSamplingForLogs,
      ),
      ...markersToEnv(markers),
    },
    telemetryCollector.caCertificatePath,
    samplingExemptionsPreloadModulePath,
  );

  return markers;
};

describe("sampling exemptions log record processor", () => {
  test(
    "re-emits errors, exceptions and exempted custom events once",
    async ({ telemetryCollector }) => {
      const markers = await runSamplingExemptionsScenario(
        true,
        telemetryCollector,
      );

      await telemetryCollector.waitForLogTelemetries(
        matchesException(markers.exceptionMessage),
      );

      expect(
        countMatching(
          telemetryCollector,
          matchesException(markers.exceptionMessage),
        ),
      ).toBe(1);
      expect(
        countMatching(telemetryCollector, matchesMessage(markers.errorMessage)),
      ).toBe(1);
      expect(
        countMatching(
          telemetryCollector,
          matchesEvent(markers.eventBooleanName),
        ),
      ).toBe(1);
      expect(
        countMatching(
          telemetryCollector,
          matchesEvent(markers.eventStringName),
        ),
      ).toBe(1);

      // Ordinary logs keep following the trace sampling, so this record never
      // reaches the ingestion endpoint.
      expect(
        countMatching(telemetryCollector, matchesMessage(markers.infoMessage)),
      ).toBe(0);

      // Already exported by the standard pipeline, so the processor must not
      // duplicate it.
      expect(
        countMatching(
          telemetryCollector,
          matchesMessage(markers.outsideSpanMessage),
        ),
      ).toBe(1);
    },
    dependencyTestTimeoutMs,
  );

  test(
    "duplicates the exempted records when trace-based sampling is disabled",
    async ({ telemetryCollector }) => {
      const markers = await runSamplingExemptionsScenario(
        false,
        telemetryCollector,
      );

      await telemetryCollector.waitForLogTelemetries(
        matchesException(markers.exceptionMessage),
      );

      // Without the distro filter both the standard pipeline and the processor
      // export the records of the unsampled trace.
      expect(
        countMatching(
          telemetryCollector,
          matchesException(markers.exceptionMessage),
        ),
      ).toBe(2);
      expect(
        countMatching(telemetryCollector, matchesMessage(markers.errorMessage)),
      ).toBe(2);
      expect(
        countMatching(
          telemetryCollector,
          matchesEvent(markers.eventBooleanName),
        ),
      ).toBe(2);

      // Records without a span context are always skipped by the processor, so
      // this misconfiguration never duplicates them.
      expect(
        countMatching(
          telemetryCollector,
          matchesMessage(markers.outsideSpanMessage),
        ),
      ).toBe(1);

      // The processor never re-emits ordinary logs, and the distro exports them
      // because nothing filters them.
      expect(
        countMatching(telemetryCollector, matchesMessage(markers.infoMessage)),
      ).toBe(1);
    },
    dependencyTestTimeoutMs,
  );
});
