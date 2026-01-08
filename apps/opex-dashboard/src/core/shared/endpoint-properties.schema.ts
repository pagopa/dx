/**
 * Shared endpoint property schemas.
 * Defines base endpoint evaluation properties used across config, builder, and template layers.
 */

import { z } from "zod";

/**
 * Base endpoint evaluation properties (no optionality or defaults).
 * Contains all common fields for availability and response time monitoring.
 */
const BaseEndpointEvaluationPropertiesSchema = z.object({
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
 * Endpoint override properties for config layer.
 * All fields optional - users specify only what they want to override.
 */
export const EndpointOverridePropertiesSchema =
  BaseEndpointEvaluationPropertiesSchema.partial().describe(
    "Optional overrides for endpoint-specific alarm thresholds and evaluation settings",
  );

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
    availability_evaluation_frequency: z
      .number()
      .default(defaults.evaluationFrequency),
    availability_evaluation_time_window: z
      .number()
      .default(defaults.evaluationTimeWindow),
    availability_event_occurrences: z
      .number()
      .default(defaults.eventOccurrences),
    availability_threshold: z.number().default(defaults.availabilityThreshold),
    response_time_evaluation_frequency: z
      .number()
      .default(defaults.evaluationFrequency),
    response_time_evaluation_time_window: z
      .number()
      .default(defaults.evaluationTimeWindow),
    response_time_event_occurrences: z
      .number()
      .default(defaults.eventOccurrences),
    response_time_threshold: z.number().default(defaults.responseTimeThreshold),
  });

/**
 * Endpoint context properties for template layer.
 * All fields optional with additional method/path for routing information.
 */
export const EndpointContextPropertiesSchema =
  BaseEndpointEvaluationPropertiesSchema.partial()
    .extend({
      method: z.string().optional(),
      path: z.string().optional(),
    })
    .describe("Template context for endpoint-specific properties");

export type EndpointContextProperties = z.infer<
  typeof EndpointContextPropertiesSchema
>;
export type EndpointOverrideProperties = z.infer<
  typeof EndpointOverridePropertiesSchema
>;
