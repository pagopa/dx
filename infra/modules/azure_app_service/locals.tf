locals {
  location_short = var.environment.location == "italynorth" ? "itn" : var.environment.location == "westeurope" ? "weu" : var.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project        = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"

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
    sku_name               = var.tier == "test" ? "B1" : var.tier == "standard" ? "P0v3" : "P1v3"
    zone_balancing_enabled = var.tier != "test"
    is_slot_enabled        = var.tier == "test" ? 0 : 1
  }

  application_insights = {
    enable = var.application_insights_connection_string != null
  }

  private_dns_zone = {
    resource_group_name = var.private_dns_zone_resource_group_name == null ? var.virtual_network.resource_group_name : var.private_dns_zone_resource_group_name
  }
}
