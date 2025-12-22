/**
 * Map config overrides from snake_case (YAML) to camelCase (internal).
 * This allows YAML config to remain in snake_case while internal code uses camelCase.
 */

import type { Overrides } from "../core/config/config.schema.js";
import type { TemplateContext } from "../core/template/context.schema.js";

/**
 * Map config overrides to camelCase template context.
 */
export function mapConfigOverrides(
  overrides: Overrides,
): Partial<TemplateContext> {
  const mapped: Partial<TemplateContext> = {};

  // Map endpoints
  if (overrides.endpoints) {
    mapped.endpoints = {};
    for (const [endpoint, props] of Object.entries(overrides.endpoints)) {
      mapped.endpoints[endpoint] = mapEndpointOverride(
        props as Record<string, unknown>,
      );
    }
  }

  // Map hosts (no transformation needed)
  if (overrides.hosts) {
    mapped.hosts = overrides.hosts;
  }

  // Map queries
  if (overrides.queries) {
    mapped.queries = mapQueryConfig(
      overrides.queries as Record<string, unknown>,
    );
  }

  return mapped;
}

/**
 * Map endpoint override properties from snake_case to camelCase.
 */
function mapEndpointOverride(
  override: Record<string, unknown>,
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  // Map snake_case to camelCase
  const propertyMap: Record<string, string> = {
    availability_evaluation_frequency: "availabilityEvaluationFrequency",
    availability_evaluation_time_window: "availabilityEvaluationTimeWindow",
    availability_event_occurrences: "availabilityEventOccurrences",
    availability_threshold: "availabilityThreshold",
    response_time_evaluation_frequency: "responseTimeEvaluationFrequency",
    response_time_evaluation_time_window: "responseTimeEvaluationTimeWindow",
    response_time_event_occurrences: "responseTimeEventOccurrences",
    response_time_threshold: "responseTimeThreshold",
  };

  for (const [key, value] of Object.entries(override)) {
    const mappedKey = propertyMap[key] || key;
    mapped[mappedKey] = value;
  }

  return mapped;
}

/**
 * Map query config from snake_case to camelCase.
 */
function mapQueryConfig(queries: Record<string, unknown>): {
  responseTimePercentile: number;
  statusCodeCategories: string[];
} {
  return {
    responseTimePercentile: (queries.response_time_percentile as number) ?? 95,
    statusCodeCategories: (queries.status_code_categories as string[]) ?? [
      "1XX",
      "2XX",
      "3XX",
      "4XX",
      "5XX",
    ],
  };
}
