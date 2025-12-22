/**
 * Azure Dashboard Terraform Builder.
 * Wraps AzDashboardRawBuilder to generate Terraform configuration with embedded dashboard JSON.
 * Uses composition pattern to reuse raw builder logic.
 */

import { mkdir, writeFile } from "fs/promises";
import * as path from "path";

import type { TerraformConfig } from "../../core/config/config.schema.js";
import type { TemplateContext } from "../../core/template/context.schema.js";

import { FileError } from "../../core/errors/index.js";
import { normalizeEndpointKeys } from "../../utils/index.js";
import { AzDashboardRawBuilder } from "../azure-dashboard-raw/index.js";
import { Builder } from "../base.js";
import { generateTerraformAssets } from "./packager.js";
import { azureDashboardTerraformTemplate } from "./template.js";

export interface AzDashboardOptions {
  actionGroupsIds: string[];
  dashboardBuilder: AzDashboardRawBuilder;
  dataSourceId: string;
  evaluationFrequency: number;
  evaluationTimeWindow: number;
  eventOccurrences: number;
  location: string;
  name: string;
  resourceType: string;
  terraformConfig?: TerraformConfig;
  timespan: string;
}

export class AzDashboardBuilder extends Builder<TemplateContext> {
  private rawBuilder: AzDashboardRawBuilder;
  private terraformConfig?: TerraformConfig;

  constructor(options: AzDashboardOptions) {
    super(azureDashboardTerraformTemplate, {
      actionGroupsIds: options.actionGroupsIds,
      dataSourceId: options.dataSourceId,
      endpoints: {},
      evaluationFrequency: options.evaluationFrequency,
      eventOccurrences: options.eventOccurrences,
      hosts: [],
      location: options.location,
      name: options.name.replace(/ /g, "_"), // Replace spaces with underscores for Terraform compatibility
      resourceType: options.resourceType,
      timespan: options.timespan,
      timeWindow: options.evaluationTimeWindow,
    });

    this.rawBuilder = options.dashboardBuilder;
    this.terraformConfig = options.terraformConfig;
  }

  /**
   * Package Terraform configuration.
   * Creates opex.tf and generates terraform assets (main.tf, variables.tf, env/).
   */
  async package(
    outputPath: string,
    values: Partial<TemplateContext> = {},
  ): Promise<void> {
    try {
      // Ensure output directory exists
      await mkdir(outputPath, { recursive: true });

      // Write main Terraform file as opex.tf
      const terraformFilePath = path.join(outputPath, "opex.tf");
      const content = this.produce(values);
      await writeFile(terraformFilePath, content, "utf-8");

      // Generate Terraform assets (boilerplate files)
      await generateTerraformAssets(outputPath, this.terraformConfig);
    } catch (error) {
      throw new FileError(
        `Failed to package Terraform configuration in ${outputPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Render Terraform template with embedded dashboard JSON from raw builder.
   */
  produce(values: Partial<TemplateContext> = {}): string {
    // Normalize endpoint overrides to support "METHOD /path" format
    // This must be done here as well to ensure Terraform alarms get correct paths
    const normalizedValues = values.endpoints
      ? { ...values, endpoints: normalizeEndpointKeys(values.endpoints) }
      : values;

    // Generate raw dashboard JSON with normalized values
    const rawJson = this.rawBuilder.produce(normalizedValues);
    const dashboard = JSON.parse(rawJson) as { properties: unknown };

    // Extract dashboard properties and format for Terraform
    this.properties.dashboardProperties = JSON.stringify(
      dashboard.properties,
      null,
      2,
    );

    // Copy hosts and endpoints from raw builder
    const rawProps = this.rawBuilder.props();
    this.properties.hosts = rawProps.hosts;
    this.properties.endpoints = rawProps.endpoints;

    return super.produce(normalizedValues);
  }
}
