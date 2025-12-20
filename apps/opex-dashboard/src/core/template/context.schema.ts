/**
 * Zod schemas for template context validation.
 * Defines the expected structure of template variables.
 */

import { z } from "zod";

// Schema for endpoint configuration
export const EndpointSchema = z.record(
  z.string(),
  z.object({
    availability_evaluation_frequency: z.number().optional(),
    availability_evaluation_time_window: z.number().optional(),
    availability_event_occurrences: z.number().optional(),
    availability_threshold: z.number().optional(),
    method: z.string().optional(),
    path: z.string().optional(),
    response_time_evaluation_frequency: z.number().optional(),
    response_time_evaluation_time_window: z.number().optional(),
    response_time_event_occurrences: z.number().optional(),
    response_time_threshold: z.number().optional(),
  }),
);

// Schema for query configuration
const QueryConfigSchema = z.object({
  response_time_percentile: z.number().default(95),
  status_code_categories: z
    .array(z.string())
    .default(["1XX", "2XX", "3XX", "4XX", "5XX"]),
});

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
export type TemplateContext = z.infer<typeof TemplateContextSchema>;
