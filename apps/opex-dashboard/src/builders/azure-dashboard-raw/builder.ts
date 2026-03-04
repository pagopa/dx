/**
 * Azure Dashboard Raw Builder.
 * Generates raw Azure dashboard JSON from OpenAPI specification.
 */

import type { TemplateContext } from "../../core/template/context.schema.js";
import type { OA3Spec } from "./builder.schema.js";

import { normalizeEndpointKeys } from "../../utils/index.js";
import { Builder } from "../base.js";
import { OA3SpecSchema } from "./builder.schema.js";
import { extractEndpoints } from "./endpoints-extractor.js";
import { azureDashboardRawTemplate } from "./template.js";

export interface AzDashboardRawOptions {
  availabilityThreshold?: number;
  evaluationFrequency: number;
  evaluationTimeWindow: number;
  eventOccurrences: number;
  location: string;
  name: string;
  oa3Spec: unknown;
  queries?: {
    response_time_percentile: number;
    status_code_categories: string[];
  };
  resourceGroup: string;
  resources: string[];
  resourceType: string;
  responseTimeThreshold?: number;
  timespan: string;
}

export class AzDashboardRawBuilder extends Builder<TemplateContext> {
  private evaluationFrequency: number;
  private evaluationTimeWindow: number;
  private eventOccurrences: number;
  private oa3Spec: OA3Spec;

  constructor(options: AzDashboardRawOptions) {
    super(azureDashboardRawTemplate, {
      action_groups_ids: [],
      availability_threshold: options.availabilityThreshold,
      data_source_id: options.resources[0],
      endpoints: {},
      evaluation_frequency: options.evaluationFrequency,
      event_occurrences: options.eventOccurrences,
      hosts: [],
      location: options.location,
      name: options.name,
      queries: options.queries,
      resource_group: options.resourceGroup,
      resource_type: options.resourceType,
      response_time_threshold: options.responseTimeThreshold,
      time_window: options.evaluationTimeWindow,
      timespan: options.timespan,
    });

    // Validate OA3 spec structure
    this.oa3Spec = OA3SpecSchema.parse(options.oa3Spec);
    this.evaluationFrequency = options.evaluationFrequency;
    this.evaluationTimeWindow = options.evaluationTimeWindow;
    this.eventOccurrences = options.eventOccurrences;
  }

  /**
   * Render the template by extracting endpoints from OA3 spec and merging with overrides.
   */
  produce(values: Partial<TemplateContext> = {}): string {
    // Extract hosts and endpoints from OA3 spec
    const { endpoints, hosts } = extractEndpoints(
      this.oa3Spec,
      this.evaluationFrequency,
      this.evaluationTimeWindow,
      this.eventOccurrences,
      this.properties.availability_threshold,
      this.properties.response_time_threshold,
    );

    // Update properties with extracted data
    this.properties.hosts = hosts;
    this.properties.endpoints = endpoints;

    // Normalize endpoint overrides to support "METHOD /path" format
    const mergedValues = values.endpoints
      ? { ...values, endpoints: normalizeEndpointKeys(values.endpoints) }
      : values;

    // Render template with merged values
    return super.produce(mergedValues);
  }
}
