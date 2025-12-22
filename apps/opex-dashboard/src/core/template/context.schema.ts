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
  action_groups_ids: z.array(z.string()),
  availability_threshold: z.number().optional(),
  base_path: z.string().optional(),
  dashboard_properties: z.string().optional(), // For Terraform template
  data_source_id: z.string(),
  endpoints: EndpointSchema,
  evaluation_frequency: z.number().optional(),
  event_occurrences: z.number().optional(),
  hosts: z.array(z.string()),
  location: z.string(),
  name: z.string(),
  queries: QueryConfigSchema.optional(),
  resource_type: z.string(),
  response_time_threshold: z.number().optional(),
  time_window: z.number().optional(),
  timespan: z.string().optional(),
});

export type EndpointConfig = z.infer<typeof EndpointSchema>;
export type SingleEndpointConfig = EndpointConfig[string];
export type TemplateContext = z.infer<typeof TemplateContextSchema>;
