/**
 * Tests for sampling-exemptions-log-record-processor.ts — the processor
 * re-emits only the records trace-based sampling would drop, and never the
 * ones the standard pipeline already exports.
 */
import type { SpanContext } from "@opentelemetry/api";
import type { LogAttributes } from "@opentelemetry/api-logs";
import type { SdkLogRecord } from "@opentelemetry/sdk-logs";

import { context, ROOT_CONTEXT, trace, TraceFlags } from "@opentelemetry/api";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { LoggerProvider } from "@opentelemetry/sdk-logs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface MockExporterInstance {
  export: ReturnType<typeof vi.fn>;
  forceFlush: ReturnType<typeof vi.fn>;
  shutdown: ReturnType<typeof vi.fn>;
}

const { exporterInstances } = vi.hoisted(() => {
  const instances: MockExporterInstance[] = [];

  return { exporterInstances: instances };
});

vi.mock("@azure/monitor-opentelemetry-exporter", () => ({
  AzureMonitorLogExporter: vi.fn(function AzureMonitorLogExporter() {
    const instance = {
      export: vi.fn(
        (
          _records: readonly unknown[],
          callback: (result: { code: number }) => void,
        ) => {
          callback({ code: 0 });
          return Promise.resolve();
        },
      ),
      forceFlush: vi.fn(() => Promise.resolve()),
      shutdown: vi.fn(() => Promise.resolve()),
    };

    exporterInstances.push(instance);

    return instance;
  }),
}));

// Mock @azure/identity so no credential provider is probed during the tests
vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: vi.fn(function DefaultAzureCredential() {
    return {
      getToken: vi.fn(),
    };
  }),
}));

const CONNECTION_STRING = "InstrumentationKey=test-key";

const SAMPLED_SPAN_CONTEXT: SpanContext = {
  spanId: "b7ad6b7169203331",
  traceFlags: TraceFlags.SAMPLED,
  traceId: "0af7651916cd43dd8448eb211c80319c",
};

const UNSAMPLED_SPAN_CONTEXT: SpanContext = {
  ...SAMPLED_SPAN_CONTEXT,
  traceFlags: TraceFlags.NONE,
};

const emitRecord = (
  spanContext: SpanContext | undefined,
  {
    attributes = {},
    severityNumber,
  }: { attributes?: LogAttributes; severityNumber?: SeverityNumber } = {},
): SdkLogRecord => {
  const records: SdkLogRecord[] = [];
  const provider = new LoggerProvider({
    processors: [
      {
        forceFlush: () => Promise.resolve(),
        onEmit: (record) => records.push(record),
        shutdown: () => Promise.resolve(),
      },
    ],
  });
  const emitContext = spanContext
    ? trace.setSpanContext(context.active(), spanContext)
    : ROOT_CONTEXT;

  provider
    .getLogger("test")
    .emit({ attributes, context: emitContext, severityNumber });

  const [record] = records;

  if (record === undefined) {
    throw new Error("The log record was not captured.");
  }

  return record;
};

const isLogRecordBatch = (value: unknown): value is readonly SdkLogRecord[] =>
  Array.isArray(value);

const exportedBatch = (call: unknown[]): readonly SdkLogRecord[] =>
  isLogRecordBatch(call[0]) ? call[0] : [];

describe("SamplingExemptionsLogRecordProcessor", () => {
  beforeEach(() => {
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", CONNECTION_STRING);
    exporterInstances.length = 0;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  const loadProcessor = async () => {
    const { SamplingExemptionsLogRecordProcessor } =
      await import("../sampling-exemptions-log-record-processor.js");

    return SamplingExemptionsLogRecordProcessor;
  };

  const exportedRecords = async (processor: {
    forceFlush: () => Promise<void>;
  }) => {
    await processor.forceFlush();

    const exporter = exporterInstances.at(-1);

    return exporter?.export.mock.calls.flatMap(exportedBatch) ?? [];
  };

  it("skips the records the standard pipeline already exports", async () => {
    const Processor = await loadProcessor();
    const processor = new Processor();

    processor.onEmit(
      emitRecord(SAMPLED_SPAN_CONTEXT, {
        severityNumber: SeverityNumber.ERROR,
      }),
    );

    await expect(exportedRecords(processor)).resolves.toStrictEqual([]);
  });

  it("skips the records without a span context", async () => {
    const Processor = await loadProcessor();
    const processor = new Processor();

    processor.onEmit(
      emitRecord(undefined, { severityNumber: SeverityNumber.ERROR }),
    );

    await expect(exportedRecords(processor)).resolves.toStrictEqual([]);
  });

  it("re-emits the records carrying an exception", async () => {
    const Processor = await loadProcessor();
    const processor = new Processor();
    const record = emitRecord(UNSAMPLED_SPAN_CONTEXT, {
      attributes: {
        "exception.stacktrace": "Error: boom\n    at test",
        "exception.type": "Error",
      },
      severityNumber: SeverityNumber.INFO,
    });

    processor.onEmit(record);

    await expect(exportedRecords(processor)).resolves.toStrictEqual([record]);
  });

  it("re-emits the records at ERROR severity or above", async () => {
    const Processor = await loadProcessor();
    const processor = new Processor();
    const record = emitRecord(UNSAMPLED_SPAN_CONTEXT, {
      severityNumber: SeverityNumber.ERROR,
    });

    processor.onEmit(record);

    await expect(exportedRecords(processor)).resolves.toStrictEqual([record]);
  });

  it.each([false, "false"])(
    "re-emits the custom events with samplingEnabled set to %s",
    async (samplingEnabled) => {
      const Processor = await loadProcessor();
      const processor = new Processor();
      const record = emitRecord(UNSAMPLED_SPAN_CONTEXT, {
        attributes: {
          "microsoft.custom_event.name": "orderCreated",
          samplingEnabled,
        },
      });

      processor.onEmit(record);

      await expect(exportedRecords(processor)).resolves.toStrictEqual([record]);
    },
  );

  it("drops the ordinary logs that are not sampling exempt", async () => {
    const Processor = await loadProcessor();
    const processor = new Processor();

    processor.onEmit(
      emitRecord(UNSAMPLED_SPAN_CONTEXT, {
        attributes: { "microsoft.custom_event.name": "orderCreated" },
        severityNumber: SeverityNumber.INFO,
      }),
    );

    await expect(exportedRecords(processor)).resolves.toStrictEqual([]);
  });

  it("resolves the exporter options from the environment", async () => {
    const { AzureMonitorLogExporter } =
      await import("@azure/monitor-opentelemetry-exporter");
    const Processor = await loadProcessor();

    new Processor();

    expect(AzureMonitorLogExporter).toHaveBeenCalledWith({
      connectionString: CONNECTION_STRING,
    });
  });

  it("layers the given exporter options over the environment ones", async () => {
    const { AzureMonitorLogExporter } =
      await import("@azure/monitor-opentelemetry-exporter");
    const Processor = await loadProcessor();

    new Processor({ disableOfflineStorage: true });

    expect(AzureMonitorLogExporter).toHaveBeenCalledWith({
      connectionString: CONNECTION_STRING,
      disableOfflineStorage: true,
    });
  });
});
