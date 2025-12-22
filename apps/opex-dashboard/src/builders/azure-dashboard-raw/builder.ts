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
    responseTimePercentile: number;
    statusCodeCategories: string[];
  };
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
      actionGroupsIds: [],
      availabilityThreshold: options.availabilityThreshold,
      dataSourceId: options.resources[0],
      endpoints: {},
      evaluationFrequency: options.evaluationFrequency,
      eventOccurrences: options.eventOccurrences,
      hosts: [],
      location: options.location,
      name: options.name,
      queries: options.queries,
      resourceType: options.resourceType,
      responseTimeThreshold: options.responseTimeThreshold,
      timespan: options.timespan,
      timeWindow: options.evaluationTimeWindow,
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
      this.properties.availabilityThreshold,
      this.properties.responseTimeThreshold,
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
