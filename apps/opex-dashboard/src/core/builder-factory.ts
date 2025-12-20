/**
 * Builder factory.
 * Creates builders using the factory pattern with type-safe registry.
 */

import type { TerraformConfig } from "./config/config.schema.js";

import { AzDashboardRawBuilder } from "../builders/azure-dashboard-raw/index.js";
import { AzDashboardBuilder } from "../builders/azure-dashboard/index.js";
import { Builder } from "../builders/base.js";
import { InvalidBuilderError } from "./errors/index.js";
import { OA3Resolver } from "./resolver/index.js";

interface AzureRawBuilderParams {
  availability_threshold?: number;
  evaluation_frequency: number;
  evaluation_time_window: number;
  event_occurrences: number;
  location: string;
  name: string;
  queries?: {
    response_time_percentile: number;
    status_code_categories: string[];
  };
  resolver: OA3Resolver;
  resource_type: string;
  resources: string[];
  response_time_threshold?: number;
  terraform?: TerraformConfig;
  timespan: string;
}

interface AzureTerraformBuilderParams extends AzureRawBuilderParams {
  action_groups_ids: string[];
  data_source_id: string;
}

/**
 * Create Azure dashboard raw builder.
 */
async function createAzureRawBuilder(
  params: AzureRawBuilderParams,
): Promise<AzDashboardRawBuilder> {
  // Resolve OA3 spec
  const oa3Spec = await params.resolver.resolve();

  return new AzDashboardRawBuilder(
    oa3Spec,
    params.name,
    params.resource_type,
    params.location,
    params.timespan,
    params.evaluation_frequency,
    params.evaluation_time_window,
    params.event_occurrences,
    params.resources,
    params.queries,
    params.availability_threshold,
    params.response_time_threshold,
  );
}

/**
 * Create Azure dashboard Terraform builder.
 */
async function createAzureTerraformBuilder(
  params: AzureTerraformBuilderParams,
): Promise<AzDashboardBuilder> {
  // Create raw builder first
  const rawBuilder = await createAzureRawBuilder(params);

  return new AzDashboardBuilder(
    rawBuilder,
    params.name,
    params.resource_type,
    params.location,
    params.timespan,
    params.evaluation_frequency,
    params.evaluation_time_window,
    params.event_occurrences,
    params.data_source_id,
    params.action_groups_ids,
    params.terraform,
  );
}

// Builder registry with type-safe factory functions
const builderRegistry = {
  "azure-dashboard": createAzureTerraformBuilder,
  "azure-dashboard-raw": createAzureRawBuilder,
} as const;

export type BuilderType = keyof typeof builderRegistry;

/**
 * Create a builder by template type.
 */
export async function createBuilder(
  templateType: BuilderType,
  params: AzureTerraformBuilderParams,
): Promise<Builder> {
  const factory = builderRegistry[templateType];

  if (!factory) {
    throw new InvalidBuilderError(
      `Invalid builder error: unknown builder ${templateType}`,
    );
  }

  try {
    return await factory(params);
  } catch (error) {
    throw new InvalidBuilderError(
      `Failed to create builder: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
