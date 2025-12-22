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
  availabilityThreshold?: number;
  evaluationFrequency: number;
  evaluationTimeWindow: number;
  eventOccurrences: number;
  location: string;
  name: string;
  queries?: {
    responseTimePercentile: number;
    statusCodeCategories: string[];
  };
  resolver: OA3Resolver;
  resources: string[];
  resourceType: string;
  responseTimeThreshold?: number;
  terraform?: TerraformConfig;
  timespan: string;
}

interface AzureTerraformBuilderParams extends AzureRawBuilderParams {
  actionGroupsIds: string[];
  dataSourceId: string;
}

/**
 * Create Azure dashboard raw builder.
 */
async function createAzureRawBuilder(
  params: AzureRawBuilderParams,
): Promise<AzDashboardRawBuilder> {
  // Resolve OA3 spec
  const oa3Spec = await params.resolver.resolve();

  return new AzDashboardRawBuilder({
    availabilityThreshold: params.availabilityThreshold,
    evaluationFrequency: params.evaluationFrequency,
    evaluationTimeWindow: params.evaluationTimeWindow,
    eventOccurrences: params.eventOccurrences,
    location: params.location,
    name: params.name,
    oa3Spec,
    queries: params.queries,
    resources: params.resources,
    resourceType: params.resourceType,
    responseTimeThreshold: params.responseTimeThreshold,
    timespan: params.timespan,
  });
}

/**
 * Create Azure dashboard Terraform builder.
 */
async function createAzureTerraformBuilder(
  params: AzureTerraformBuilderParams,
): Promise<AzDashboardBuilder> {
  // Create raw builder first
  const rawBuilder = await createAzureRawBuilder(params);

  return new AzDashboardBuilder({
    actionGroupsIds: params.actionGroupsIds,
    dashboardBuilder: rawBuilder,
    dataSourceId: params.dataSourceId,
    evaluationFrequency: params.evaluationFrequency,
    evaluationTimeWindow: params.evaluationTimeWindow,
    eventOccurrences: params.eventOccurrences,
    location: params.location,
    name: params.name,
    resourceType: params.resourceType,
    terraformConfig: params.terraform,
    timespan: params.timespan,
  });
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
