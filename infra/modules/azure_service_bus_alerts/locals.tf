locals {
  tags = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/package.json")).name, "unknown") })

  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  resource_group_name = provider::azurerm::parse_resource_id(var.service_bus_namespace_id)["resource_group_name"]

  severity_map = {
    "Critical"      = 0
    "Error"         = 1
    "Warning"       = 2
    "Informational" = 3
    "Verbose"       = 4
  }
  dlq_severity    = try(local.severity_map[var.alerts_on_dlq_messages.severity], 1)
  active_severity = try(local.severity_map[var.alerts_on_active_messages.severity], 1)
}
