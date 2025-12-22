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
