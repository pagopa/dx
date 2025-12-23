/**
 * Shared endpoint property schemas.
 * Defines base endpoint evaluation properties used across config, builder, and template layers.
 */

import { z } from "zod";

/**
 * Raw endpoint evaluation properties with snake_case naming (matching YAML input).
 * Contains all common fields for availability and response time monitoring.
 */
const BaseEndpointEvaluationPropertiesSchemaRaw = z.object({
  // Availability monitoring properties
  availability_evaluation_frequency: z.number(),
  availability_evaluation_time_window: z.number(),
  availability_event_occurrences: z.number(),
  availability_threshold: z.number(),

  // Response time monitoring properties
  response_time_evaluation_frequency: z.number(),
  response_time_evaluation_time_window: z.number(),
  response_time_event_occurrences: z.number(),
  response_time_threshold: z.number(),
});

/**
 * Raw endpoint override properties for config layer (snake_case).
 * All fields optional - users specify only what they want to override.
 */
export const EndpointOverridePropertiesSchemaRaw =
  BaseEndpointEvaluationPropertiesSchemaRaw.partial().describe(
    "Optional overrides for endpoint-specific alarm thresholds and evaluation settings",
  );

/**
 * Endpoint override properties for config layer (camelCase, internal use).
 * All fields optional - users specify only what they want to override.
 */
const BaseEndpointEvaluationPropertiesSchema = z.object({
  // Availability monitoring properties
  availabilityEvaluationFrequency: z.number(),
  availabilityEvaluationTimeWindow: z.number(),
  availabilityEventOccurrences: z.number(),
  availabilityThreshold: z.number(),

  // Response time monitoring properties
  responseTimeEvaluationFrequency: z.number(),
  responseTimeEvaluationTimeWindow: z.number(),
  responseTimeEventOccurrences: z.number(),
  responseTimeThreshold: z.number(),
});

export const EndpointOverridePropertiesSchema =
  BaseEndpointEvaluationPropertiesSchema.partial();

/**
 * Transform endpoint override properties from snake_case to camelCase.
 */
export function transformEndpointOverrideProperties(
  raw: z.infer<typeof EndpointOverridePropertiesSchemaRaw>,
): z.infer<typeof EndpointOverridePropertiesSchema> {
  const result: z.infer<typeof EndpointOverridePropertiesSchema> = {};

  if (raw.availability_evaluation_frequency !== undefined) {
    result.availabilityEvaluationFrequency =
      raw.availability_evaluation_frequency;
  }
  if (raw.availability_evaluation_time_window !== undefined) {
    result.availabilityEvaluationTimeWindow =
      raw.availability_evaluation_time_window;
  }
  if (raw.availability_event_occurrences !== undefined) {
    result.availabilityEventOccurrences = raw.availability_event_occurrences;
  }
  if (raw.availability_threshold !== undefined) {
    result.availabilityThreshold = raw.availability_threshold;
  }
  if (raw.response_time_evaluation_frequency !== undefined) {
    result.responseTimeEvaluationFrequency =
      raw.response_time_evaluation_frequency;
  }
  if (raw.response_time_evaluation_time_window !== undefined) {
    result.responseTimeEvaluationTimeWindow =
      raw.response_time_evaluation_time_window;
  }
  if (raw.response_time_event_occurrences !== undefined) {
    result.responseTimeEventOccurrences = raw.response_time_event_occurrences;
  }
  if (raw.response_time_threshold !== undefined) {
    result.responseTimeThreshold = raw.response_time_threshold;
  }

  return result;
}

/**
 * Endpoint configuration with defaults for builder layer.
 * All fields required with default values applied.
 */
export const createEndpointConfigPropertiesSchema = (defaults: {
  availabilityThreshold: number;
  evaluationFrequency: number;
  evaluationTimeWindow: number;
  eventOccurrences: number;
  responseTimeThreshold: number;
}) =>
  z.object({
    availabilityEvaluationFrequency: z
      .number()
      .default(defaults.evaluationFrequency),
    availabilityEvaluationTimeWindow: z
      .number()
      .default(defaults.evaluationTimeWindow),
    availabilityEventOccurrences: z.number().default(defaults.eventOccurrences),
    availabilityThreshold: z.number().default(defaults.availabilityThreshold),
    responseTimeEvaluationFrequency: z
      .number()
      .default(defaults.evaluationFrequency),
    responseTimeEvaluationTimeWindow: z
      .number()
      .default(defaults.evaluationTimeWindow),
    responseTimeEventOccurrences: z.number().default(defaults.eventOccurrences),
    responseTimeThreshold: z.number().default(defaults.responseTimeThreshold),
  });

/**
 * Endpoint context properties for template layer.
 * All fields optional with additional method/path for routing information.
 */
export const EndpointContextPropertiesSchema = z
  .object({
    availabilityEvaluationFrequency: z.number().optional(),
    availabilityEvaluationTimeWindow: z.number().optional(),
    availabilityEventOccurrences: z.number().optional(),
    availabilityThreshold: z.number().optional(),
    method: z.string().optional(),
    path: z.string().optional(),
    responseTimeEvaluationFrequency: z.number().optional(),
    responseTimeEvaluationTimeWindow: z.number().optional(),
    responseTimeEventOccurrences: z.number().optional(),
    responseTimeThreshold: z.number().optional(),
  })
  .describe("Template context for endpoint-specific properties");

export type EndpointContextProperties = z.infer<
  typeof EndpointContextPropertiesSchema
>;
export type EndpointOverrideProperties = z.infer<
  typeof EndpointOverridePropertiesSchema
>;
export type EndpointOverridePropertiesRaw = z.infer<
  typeof EndpointOverridePropertiesSchemaRaw
>;
