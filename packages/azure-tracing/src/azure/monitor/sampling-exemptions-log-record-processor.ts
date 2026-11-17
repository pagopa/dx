/**
 * Re-emits the log records the Azure Monitor distro drops.
 *
 * When `enableTraceBasedSamplingForLogs` is enabled, the distro forwards only
 * the logs correlated with sampled traces. Errors, exceptions and custom events
 * explicitly marked as exempt must reach Application Insights anyway, so this
 * processor exports them through an additional Azure Monitor log exporter.
 */
import type { SdkLogRecord } from "@opentelemetry/sdk-logs";

import { AzureMonitorLogExporter } from "@azure/monitor-opentelemetry-exporter";
import { TraceFlags } from "@opentelemetry/api";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";

import { loadEnv } from "./env.js";
import {
  type AzureMonitorExporterOptionsOverride,
  resolveAzureMonitorExporterOptions,
} from "./options.js";

const CUSTOM_EVENT_NAME_ATTRIBUTE = "microsoft.custom_event.name";

const isSamplingExemptCustomEvent = (record: SdkLogRecord) => {
  if (!record.attributes[CUSTOM_EVENT_NAME_ATTRIBUTE]) {
    return false;
  }

  const { samplingEnabled } = record.attributes;

  return samplingEnabled === false || samplingEnabled === "false";
};

const isSamplingExempt = (record: SdkLogRecord) =>
  Boolean(
    record.attributes["exception.type"] &&
    record.attributes["exception.stacktrace"],
  ) ||
  (record.severityNumber ?? SeverityNumber.UNSPECIFIED) >=
    SeverityNumber.ERROR ||
  isSamplingExemptCustomEvent(record);

/**
 * Log record processor exporting the records that trace-based sampling would
 * otherwise drop: errors, exceptions and custom events marked as exempt.
 *
 * The standard pipeline marks the records it already exports as sampled, so
 * this processor emits only the unsampled ones to avoid duplicate telemetry.
 * Records without a span context are always exported by the standard pipeline.
 *
 * Register it only together with `enableTraceBasedSamplingForLogs: true`: when
 * that option is `false` the distro exports every record anyway, so the
 * processor would duplicate the ones it re-emits.
 *
 * @example
 * initAzureMonitor([], {
 *   enableTraceBasedSamplingForLogs: true,
 *   logRecordProcessors: [new SamplingExemptionsLogRecordProcessor()],
 * });
 */
export class SamplingExemptionsLogRecordProcessor extends BatchLogRecordProcessor {
  /**
   * @param exporterOptions - Exporter options layered over the
   *   environment-derived ones. Omit it when the connection string comes from
   *   `APPLICATIONINSIGHTS_CONNECTION_STRING`.
   */
  constructor(exporterOptions: AzureMonitorExporterOptionsOverride = {}) {
    super({
      exporter: new AzureMonitorLogExporter(
        resolveAzureMonitorExporterOptions(loadEnv(), exporterOptions),
      ),
    });
  }

  override onEmit(record: SdkLogRecord): void {
    const isAlreadyExported =
      !record.spanContext?.spanId ||
      record.spanContext.traceFlags === TraceFlags.SAMPLED;

    if (isAlreadyExported || !isSamplingExempt(record)) {
      return;
    }

    super.onEmit(record);
  }
}
