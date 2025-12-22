/**
 * Zod schemas for Azure dashboard raw builder.
 * Defines the structure of builder properties and endpoint configurations.
 */

import { z } from "zod";

import {
  DEFAULT_AVAILABILITY_THRESHOLD,
  DEFAULT_RESPONSE_TIME_THRESHOLD,
  EVALUATION_FREQUENCY_MINUTES,
  EVENT_OCCURRENCES,
  TIME_WINDOW_MINUTES,
} from "../../constants/index.js";
import { createEndpointConfigPropertiesSchema } from "../../core/shared/endpoint-properties.schema.js";

// Schema for endpoint configuration with default values
export const EndpointConfigSchema = createEndpointConfigPropertiesSchema({
  availabilityThreshold: DEFAULT_AVAILABILITY_THRESHOLD,
  evaluationFrequency: EVALUATION_FREQUENCY_MINUTES,
  evaluationTimeWindow: TIME_WINDOW_MINUTES,
  eventOccurrences: EVENT_OCCURRENCES,
  responseTimeThreshold: DEFAULT_RESPONSE_TIME_THRESHOLD,
}).extend({
  method: z.string().optional(),
  path: z.string().optional(),
});

// Schema for builder properties
export const BuilderPropertiesSchema = z.object({
  endpoints: z.record(z.string(), EndpointConfigSchema).optional(),
  evaluationFrequency: z.number(),
  evaluationTimeWindow: z.number(),
  eventOccurrences: z.number(),
  hosts: z.array(z.string()).optional(),
  location: z.string(),
  name: z.string(),
  resourceIds: z.array(z.string()),
  resourceType: z.enum(["app-gateway", "api-management"]),
  timespan: z.string(),
});

// Schema for OA3 server object
export const OA3ServerSchema = z.object({
  description: z.string().optional(),
  url: z.string(),
});

// Schema for OA3 spec structure (minimal required fields)
export const OA3SpecSchema = z.object({
  basePath: z.string().optional(), // OA2
  host: z.string().optional(), // OA2
  openapi: z.string().optional(), // OA3
  paths: z.record(z.string(), z.unknown()),
  servers: z.array(OA3ServerSchema).optional(), // OA3
  swagger: z.string().optional(), // OA2
});

export type BuilderProperties = z.infer<typeof BuilderPropertiesSchema>;
export type EndpointConfig = z.infer<typeof EndpointConfigSchema>;
export type OA3Server = z.infer<typeof OA3ServerSchema>;
export type OA3Spec = z.infer<typeof OA3SpecSchema>;
