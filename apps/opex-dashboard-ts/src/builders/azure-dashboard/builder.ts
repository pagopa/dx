/**
 * Azure Dashboard Terraform Builder.
 * Wraps AzDashboardRawBuilder to generate Terraform configuration with embedded dashboard JSON.
 * Uses composition pattern to reuse raw builder logic.
 */

import * as fs from "fs";
import * as path from "path";

import type { TerraformConfig } from "../../core/config/config.schema.js";
import type { TemplateContext } from "../../core/template/context.schema.js";

import { normalizeEndpointKeys } from "../../utils/index.js";
import { AzDashboardRawBuilder } from "../azure-dashboard-raw/index.js";
import { Builder } from "../base.js";
import { generateTerraformAssets } from "./packager.js";
import { azureDashboardTerraformTemplate } from "./template.js";

export class AzDashboardBuilder extends Builder<TemplateContext> {
  private rawBuilder: AzDashboardRawBuilder;
  private terraformConfig?: TerraformConfig;

  constructor(
    dashboardBuilder: AzDashboardRawBuilder,
    name: string,
    resourceType: string,
    location: string,
    timespan: string,
    evaluationFrequency: number,
    evaluationTimeWindow: number,
    eventOccurrences: number,
    dataSourceId: string,
    actionGroupsIds: string[],
    terraformConfig?: TerraformConfig,
  ) {
    super(azureDashboardTerraformTemplate, {
      action_groups_ids: actionGroupsIds,
      data_source_id: dataSourceId,
      endpoints: {},
      evaluation_frequency: evaluationFrequency,
      event_occurrences: eventOccurrences,
      hosts: [],
      location,
      name: name.replace(/ /g, "_"), // Replace spaces with underscores for Terraform compatibility
      resource_type: resourceType,
      time_window: evaluationTimeWindow,
      timespan,
    });

    this.rawBuilder = dashboardBuilder;
    this.terraformConfig = terraformConfig;
  }

  /**
   * Package Terraform configuration.
   * Creates opex.tf and generates terraform assets (main.tf, variables.tf, env/).
   */
  package(outputPath: string, values: Partial<TemplateContext> = {}): void {
    // Ensure output directory exists
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    // Write main Terraform file as opex.tf
    const terraformFilePath = path.join(outputPath, "opex.tf");
    const content = this.produce(values);
    fs.writeFileSync(terraformFilePath, content, "utf-8");

    // Generate Terraform assets (boilerplate files)
    generateTerraformAssets(outputPath, this.terraformConfig);
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
    this.properties.dashboard_properties = JSON.stringify(
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
