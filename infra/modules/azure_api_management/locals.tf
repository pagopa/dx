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
  apim_name = local.naming_config.name != "apim" ? local.naming_config.name : ""

  apim = {
    name           = provider::dx::resource_name(merge(local.naming_config, { name = local.apim_name, resource_type = "api_management" }))
    pep_name       = local.use_case_features.private_endpoint ? provider::dx::resource_name(merge(local.naming_config, { name = local.apim_name, resource_type = "apim_private_endpoint" })) : null
    autoscale_name = local.use_case_features.autoscale ? provider::dx::resource_name(merge(local.naming_config, { name = local.apim_name, resource_type = "api_management_autoscale" })) : null

    log_category_groups = ["allLogs", "audit"]
    log_category_types  = ["DeveloperPortalAuditLogs", "GatewayLogs", "WebSocketConnectionLogs"]
  }

  use_cases = {
    development = {
      sku                                        = "Developer_1"
      virtual_network_type                       = "Internal"
      autoscale                                  = false
      alerts                                     = false
      private_endpoint                           = false
      zones                                      = null
      developer_portal_username_password_enabled = true
    }
    cost_optimized = {
      sku                                        = "StandardV2_1"
      virtual_network_type                       = "External"
      autoscale                                  = false
      alerts                                     = true
      private_endpoint                           = true
      zones                                      = null
      developer_portal_username_password_enabled = false
    }
    high_load = {
      sku                                        = "Premium_2"
      virtual_network_type                       = "Internal"
      autoscale                                  = true
      alerts                                     = true
      private_endpoint                           = false
      zones                                      = ["1", "2"]
      developer_portal_username_password_enabled = false
    }
  }

  use_case_features = local.use_cases[var.use_case]

  virtual_network_type                  = var.virtual_network_type_internal != null ? (var.virtual_network_type_internal ? "Internal" : "None") : local.use_case_features.virtual_network_type
  virtual_network_configuration_enabled = local.virtual_network_type == "Internal" || var.use_case == "cost_optimized" ? true : false
  public_network                        = var.enable_public_network_access
  private_dns_zone_resource_group_name  = var.private_dns_zone_resource_group_name != null ? var.private_dns_zone_resource_group_name : data.azurerm_virtual_network.this.resource_group_name

  # Private DNS Zone IDs - merges overrides with data source lookups
  private_dns_zone_ids = {
    azure_api_net             = var.private_dns_zone_ids != null && var.private_dns_zone_ids.azure_api_net != null ? var.private_dns_zone_ids.azure_api_net : data.azurerm_private_dns_zone.azure_api_net[0].id
    management_azure_api_net  = var.private_dns_zone_ids != null && var.private_dns_zone_ids.management_azure_api_net != null ? var.private_dns_zone_ids.management_azure_api_net : data.azurerm_private_dns_zone.management_azure_api_net[0].id
    scm_azure_api_net         = var.private_dns_zone_ids != null && var.private_dns_zone_ids.scm_azure_api_net != null ? var.private_dns_zone_ids.scm_azure_api_net : data.azurerm_private_dns_zone.scm_azure_api_net[0].id
    privatelink_azure_api_net = var.private_dns_zone_ids != null && var.private_dns_zone_ids.privatelink_azure_api_net != null ? var.private_dns_zone_ids.privatelink_azure_api_net : (local.use_case_features.private_endpoint ? data.azurerm_private_dns_zone.apim[0].id : null)
  }

  # Extract the VNet instance number from the last dash-separated segment of the VNet name.
  # Falls back to the environment instance number if parsing fails.
  vnet_instance_number = try(
    tonumber(split("-", var.virtual_network.name)[length(split("-", var.virtual_network.name)) - 1]),
    tonumber(var.environment.instance_number)
  )

  # Auto-compute the APIM subnet name following the standard naming convention.
  # domain is explicitly cleared so the subnet name is not domain-scoped (subnets are shared infrastructure).
  apim_subnet_name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = "",
    name          = local.apim_name,
    resource_type = "apim_subnet",
  }))

  # Auto-compute the private endpoint subnet name following the standard naming convention.
  pep_subnet_name = provider::dx::resource_name(merge(local.naming_config, {
    domain          = "",
    name            = "pep",
    resource_type   = "subnet",
    instance_number = local.vnet_instance_number,
  }))

  has_existing_subnet = var.subnet_id != null
  subnet_id           = local.has_existing_subnet ? var.subnet_id : azurerm_subnet.apim[0].id

  subnet_pep_id = local.use_case_features.private_endpoint ? coalesce(
    var.subnet_pep_id,
    provider::azurerm::normalise_resource_id("${data.azurerm_virtual_network.this.id}/subnets/${local.pep_subnet_name}")
  ) : null

  # Calculate zone multiplier for autoscale defaults
  zone_multiplier = local.use_case_features.zones != null ? length(local.use_case_features.zones) : 1

  # Autoscale configuration with zone-aware defaults
  autoscale_config = {
    minimum_instances             = coalesce(try(var.autoscale.minimum_instances, null), local.zone_multiplier)
    default_instances             = coalesce(try(var.autoscale.default_instances, null), local.zone_multiplier)
    maximum_instances             = coalesce(try(var.autoscale.maximum_instances, null), 5 * local.zone_multiplier)
    scale_out_capacity_percentage = coalesce(try(var.autoscale.scale_out_capacity_percentage, null), 60)
    scale_out_time_window         = coalesce(try(var.autoscale.scale_out_time_window, null), "PT10M")
    scale_out_value               = coalesce(try(var.autoscale.scale_out_value, null), tostring(local.zone_multiplier))
    scale_out_cooldown            = coalesce(try(var.autoscale.scale_out_cooldown, null), "PT45M")
    scale_in_capacity_percentage  = coalesce(try(var.autoscale.scale_in_capacity_percentage, null), 30)
    scale_in_time_window          = coalesce(try(var.autoscale.scale_in_time_window, null), "PT30M")
    scale_in_value                = coalesce(try(var.autoscale.scale_in_value, null), tostring(local.zone_multiplier))
    scale_in_cooldown             = coalesce(try(var.autoscale.scale_in_cooldown, null), "PT30M")
  }
}
