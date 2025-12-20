/**
 * Terraform template for Azure Dashboard with query rule alerts.
 */

import type { TemplateContext } from "../../core/template/context.schema.js";

import * as queries from "../queries/index.js";

/**
 * Generate Terraform configuration for Azure Portal Dashboard with alerts.
 */
export function azureDashboardTerraformTemplate(
  context: TemplateContext,
): string {
  const name = context.name;
  const dashboardProperties = context.dashboard_properties || "";
  const basePath = context.base_path ?? "";
  const actionGroupsJson = JSON.stringify(context.action_groups_ids).replace(
    /,/g,
    ", ",
  );
  const dataSourceId = context.data_source_id;

  // Determine which query functions to use based on resource type
  const queryFns =
    context.resource_type === "api-management"
      ? queries.apiManagement
      : queries.appGateway;

  return `
locals {
  name                = "\${var.prefix}-\${var.env_short}-${name}"
  dashboard_base_addr = "https://portal.azure.com/#@pagopait.onmicrosoft.com/dashboard/arm"
}

data "azurerm_resource_group" "this" {
  name     = "dashboards"
}

resource "azurerm_portal_dashboard" "this" {
  name                = local.name
  resource_group_name = data.azurerm_resource_group.this.name
  location            = data.azurerm_resource_group.this.location

  dashboard_properties = <<-PROPS
    ${dashboardProperties}
  PROPS

  tags = var.tags
}


${Object.entries(context.endpoints)
  .map(([endpoint, propsUnknown], i) => {
    const props = propsUnknown as Record<string, unknown>;
    const fullPath = basePath + endpoint;

    // Availability alarm query
    const availabilityQuery = queryFns.availabilityQuery({
      ...context,
      endpoint,
      is_alarm: true,
      threshold: props.availability_threshold as number | undefined,
      ...props,
    });

    // Response time alarm query
    const responseTimeQuery = queryFns.responseTimeQuery({
      ...context,
      endpoint,
      is_alarm: true,
      threshold: props.response_time_threshold as number | undefined,
      ...props,
    });

    return `resource "azurerm_monitor_scheduled_query_rules_alert" "alarm_availability_${i}" {
  name                = replace(join("_",split("/", "\${local.name}-availability @ ${fullPath}")), "/\\\\{|\\\\}/", "")
  resource_group_name = data.azurerm_resource_group.this.name
  location            = data.azurerm_resource_group.this.location

  action {
    action_group = ${actionGroupsJson}
  }

  data_source_id          = "${dataSourceId}"
  description             = "Availability for ${fullPath} is less than or equal to 99% - \${local.dashboard_base_addr}\${azurerm_portal_dashboard.this.id}"
  enabled                 = true
  auto_mitigation_enabled = false

  query = <<-QUERY

    
${availabilityQuery}

  QUERY

  severity    = 1
  frequency   = ${(props.availability_evaluation_frequency as number | undefined) ?? 10}
  time_window = ${(props.availability_evaluation_time_window as number | undefined) ?? 20}
  trigger {
    operator  = "GreaterThanOrEqual"
    threshold = ${(props.availability_event_occurrences as number | undefined) ?? 1}
  }

  tags = var.tags
}

resource "azurerm_monitor_scheduled_query_rules_alert" "alarm_time_${i}" {
  name                = replace(join("_",split("/", "\${local.name}-responsetime @ ${fullPath}")), "/\\\\{|\\\\}/", "")
  resource_group_name = data.azurerm_resource_group.this.name
  location            = data.azurerm_resource_group.this.location

  action {
    action_group = ${actionGroupsJson}
  }

  data_source_id          = "${dataSourceId}"
  description             = "Response time for ${fullPath} is less than or equal to 1s - \${local.dashboard_base_addr}\${azurerm_portal_dashboard.this.id}"
  enabled                 = true
  auto_mitigation_enabled = false

  query = <<-QUERY

    
${responseTimeQuery}

  QUERY

  severity    = 1
  frequency   = ${(props.response_time_evaluation_frequency as number | undefined) ?? 10}
  time_window = ${(props.response_time_evaluation_time_window as number | undefined) ?? 20}
  trigger {
    operator  = "GreaterThanOrEqual"
    threshold = ${(props.response_time_event_occurrences as number | undefined) ?? 1}
  }

  tags = var.tags
}
`;
  })
  .join("\n")}
`;
}
