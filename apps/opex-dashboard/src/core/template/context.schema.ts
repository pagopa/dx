/**
 * Zod schemas for template context validation.
 * Defines the expected structure of template variables.
 */

import { z } from "zod";

import { EndpointContextPropertiesSchema } from "../shared/endpoint-properties.schema.js";
import { QueryConfigSchema } from "../shared/query-config.schema.js";

// Schema for endpoint configuration
export const EndpointSchema = z.record(
  z.string(),
  EndpointContextPropertiesSchema,
);

// Schema for main template context
export const TemplateContextSchema = z.object({
  actionGroupsIds: z.array(z.string()),
  availabilityThreshold: z.number().optional(),
  basePath: z.string().optional(),
  dashboardProperties: z.string().optional(), // For Terraform template
  dataSourceId: z.string(),
  endpoints: EndpointSchema,
  evaluationFrequency: z.number().optional(),
  eventOccurrences: z.number().optional(),
  hosts: z.array(z.string()),
  location: z.string(),
  name: z.string(),
  queries: QueryConfigSchema.optional(),
  resourceType: z.string(),
  responseTimeThreshold: z.number().optional(),
  timespan: z.string().optional(),
  timeWindow: z.number().optional(),
});

export type EndpointConfig = z.infer<typeof EndpointSchema>;
export type SingleEndpointConfig = EndpointConfig[string];
export type TemplateContext = z.infer<typeof TemplateContextSchema>;
