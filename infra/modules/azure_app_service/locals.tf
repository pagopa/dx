locals {
  subnet = {
    enable_service_endpoints = var.subnet_service_endpoints != null ? concat(
      var.subnet_service_endpoints.cosmos ? ["Microsoft.CosmosDB"] : [],
      var.subnet_service_endpoints.web ? ["Microsoft.Web"] : [],
      var.subnet_service_endpoints.storage ? ["Microsoft.Storage"] : [],
    ) : []
  }

  app_service_plan = {
    enable = var.app_service_plan_id == null
  }

  app_service = {
    name                   = "${module.naming_convention.prefix}-app-${module.naming_convention.suffix}"
    sku_name               = local.sku_name_mapping[local.tier]
    zone_balancing_enabled = local.tier != "s"
    is_slot_enabled        = local.tier == "s" ? 0 : 1
    command_line           = var.pm2_startup_file_name == null ? null : "pm2 start ${var.pm2_startup_file_name} -i max --no-daemon"
  }

  app_service_slot = {
    name = "staging"
  }

  application_insights = {
    enable = var.application_insights_connection_string != null
  }

  private_dns_zone = {
    resource_group_name = var.private_dns_zone_resource_group_name == null ? var.virtual_network.resource_group_name : var.private_dns_zone_resource_group_name
  }
}
