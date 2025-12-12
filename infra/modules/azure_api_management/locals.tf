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

  # Defines the naming convention for APIM, dynamically handling cases where app_name
  # is not "apim" or a domain is specified, to avoid redundant naming logic.
  apim = {
    name           = replace(provider::dx::resource_name(merge(local.naming_config, { resource_type = "api_management" })), "-apim-apim-", "-apim-")
    pep_name       = local.use_case_features.private_endpoint ? replace(provider::dx::resource_name(merge(local.naming_config, { resource_type = "apim_private_endpoint" })), "-apim-apim-", "-apim-") : null
    autoscale_name = local.use_case_features.autoscale ? replace(provider::dx::resource_name(merge(local.naming_config, { resource_type = "api_management_autoscale" })), "-apim-apim-", "-apim-") : null

    log_category_groups = ["allLogs", "audit"]
    log_category_types  = ["DeveloperPortalAuditLogs", "GatewayLogs", "WebSocketConnectionLogs"]
  }

  use_cases = {
    development = {
      sku                  = "Developer_1"
      virtual_network_type = "Internal"
      public_network       = false
      autoscale            = false
      alerts               = false
      private_endpoint     = false
      zones                = null
    }
    cost_optimized = {
      sku                  = "StandardV2_1"
      virtual_network_type = "External"
      public_network       = false
      autoscale            = false
      alerts               = true
      private_endpoint     = true
      zones                = null
    }
    high_load = {
      sku                  = "Premium_2"
      virtual_network_type = "Internal"
      public_network       = true
      autoscale            = true
      alerts               = true
      private_endpoint     = false
      zones                = ["1", "2"]
    }
  }

  use_case_features = local.use_cases[var.use_case]

  virtual_network_type                  = var.virtual_network_type_internal != null ? (var.virtual_network_type_internal ? "Internal" : "None") : local.use_case_features.virtual_network_type
  virtual_network_configuration_enabled = local.virtual_network_type == "Internal" || var.use_case == "cost_optimized" ? true : false
  public_network                        = var.enable_public_network_access != null ? var.enable_public_network_access : local.use_case_features.public_network
  private_dns_zone_resource_group_name  = var.private_dns_zone_resource_group_name != null ? var.private_dns_zone_resource_group_name : data.azurerm_virtual_network.this.resource_group_name

  # Private DNS Zone IDs - merges overrides with data source lookups
  private_dns_zone_ids = {
    azure_api_net             = var.private_dns_zone_ids != null && var.private_dns_zone_ids.azure_api_net != null ? var.private_dns_zone_ids.azure_api_net : data.azurerm_private_dns_zone.azure_api_net[0].id
    management_azure_api_net  = var.private_dns_zone_ids != null && var.private_dns_zone_ids.management_azure_api_net != null ? var.private_dns_zone_ids.management_azure_api_net : data.azurerm_private_dns_zone.management_azure_api_net[0].id
    scm_azure_api_net         = var.private_dns_zone_ids != null && var.private_dns_zone_ids.scm_azure_api_net != null ? var.private_dns_zone_ids.scm_azure_api_net : data.azurerm_private_dns_zone.scm_azure_api_net[0].id
    privatelink_azure_api_net = var.private_dns_zone_ids != null && var.private_dns_zone_ids.privatelink_azure_api_net != null ? var.private_dns_zone_ids.privatelink_azure_api_net : (local.use_case_features.private_endpoint ? data.azurerm_private_dns_zone.apim[0].id : null)
  }
}
