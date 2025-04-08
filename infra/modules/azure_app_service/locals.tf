locals {
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

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
    name                   = provider::dx::resource_name(merge(local.naming_config, { resource_type = "app_service" }))
    sku_name               = local.sku_name_mapping[local.tier]
    has_existing_subnet    = var.subnet_id != null
    zone_balancing_enabled = local.tier != "s"
    is_slot_enabled        = local.tier == "s" ? 0 : 1
    private_endpoint_name  = provider::dx::resource_name(merge(local.naming_config, { resource_type = "app_private_endpoint" }))
  }

  app_service_slot = {
    name                  = "staging"
    private_endpoint_name = provider::dx::resource_name(merge(local.naming_config, { resource_type = "app_slot_private_endpoint" }))
  }

  application_insights = {
    enable = var.application_insights_connection_string != null
  }

  private_dns_zone = {
    resource_group_name = var.private_dns_zone_resource_group_name == null ? var.virtual_network.resource_group_name : var.private_dns_zone_resource_group_name
  }
}
