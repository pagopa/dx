/**
 * Normalize Azure Monitor envelopes down to the stable contract our tests assert on.
 */
export interface CapturedHttpRequest {
  body: string;
  headers: Record<string, string | readonly string[] | undefined>;
  method: string;
  url: string;
}

export interface TelemetryEnvelope {
  data?: {
    baseData?: Record<string, unknown>;
    baseType?: string;
  };
  name?: string;
  tags?: Record<string, string>;
}

export interface NormalizedTelemetryItem {
  data?: string;
  dependencyName?: string;
  dependencyType?: string;
  eventName?: string;
  operationId?: string;
  operationParentId?: string;
  properties?: Record<string, string>;
  resultCode?: string;
  success?: boolean;
  telemetryType: "dependency" | "event";
}

const ignoredPropertyKeys = new Set([
  "_MS.ProcessedByMetricExtractors",
  "db.connection_string",
  "http.request.method_original",
  "http.response_content_length_uncompressed",
]);

const applyReplacements = (
  value: string,
  replacements: readonly (readonly [string, string])[],
) =>
  replacements
    .filter(([needle]) => needle.length > 0)
    .sort(([left], [right]) => right.length - left.length)
    .reduce(
      (current, [needle, replacement]) => current.split(needle).join(replacement),
      value,
    );

const normalizeStringRecord = (
  value: unknown,
  replacements: readonly (readonly [string, string])[],
) => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const entries = Object.entries(value)
    .filter(([key, nestedValue]) => {
      return !ignoredPropertyKeys.has(key) && typeof nestedValue === "string";
    })
    .map(([key, nestedValue]) => [key, applyReplacements(nestedValue, replacements)]);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

export const normalizeTelemetry = (
  envelopes: readonly TelemetryEnvelope[],
  replacements: readonly (readonly [string, string])[],
) =>
  envelopes
    .flatMap((envelope): readonly NormalizedTelemetryItem[] => {
      const baseData = envelope.data?.baseData;

      if (!baseData || typeof baseData !== "object") {
        return [];
      }

      if (
        envelope.name === "Microsoft.ApplicationInsights.Event" &&
        typeof baseData.name === "string"
      ) {
        const properties = normalizeStringRecord(baseData.properties, replacements);

        return [
          {
            eventName: baseData.name,
            ...(properties ? { properties } : {}),
            telemetryType: "event",
          },
        ];
      }

      if (
        envelope.name === "Microsoft.ApplicationInsights.RemoteDependency" &&
        typeof baseData.name === "string"
      ) {
        const data =
          typeof baseData.data === "string"
            ? applyReplacements(baseData.data, replacements)
            : undefined;
        const dependencyType =
          typeof baseData.type === "string" ? baseData.type : undefined;
        const operationId = envelope.tags?.["ai.operation.id"];
        const operationParentId = envelope.tags?.["ai.operation.parentId"];
        const properties = normalizeStringRecord(baseData.properties, replacements);
        const resultCode =
          typeof baseData.resultCode === "string"
            ? baseData.resultCode
            : undefined;
        const success =
          typeof baseData.success === "boolean" ? baseData.success : undefined;

        return [
          {
            ...(data ? { data } : {}),
            dependencyName: baseData.name,
            ...(dependencyType ? { dependencyType } : {}),
            ...(operationId ? { operationId } : {}),
            ...(operationParentId ? { operationParentId } : {}),
            ...(properties ? { properties } : {}),
            ...(resultCode ? { resultCode } : {}),
            ...(success !== undefined ? { success } : {}),
            telemetryType: "dependency",
          },
        ];
      }

      return [];
    })
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    );
