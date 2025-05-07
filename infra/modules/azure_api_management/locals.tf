locals {
  tags = merge(var.tags, { module_version = try(jsondecode(file("${path.module}/package.json")).version, "unknown") })
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
    autoscale_name = contains(["l", "xl"], var.tier) ? replace(provider::dx::resource_name(merge(local.naming_config, { resource_type = "api_management_autoscale" })), "-apim-apim-", "-apim-") : null
    zones          = var.tier == "xl" ? ["1", "2", "3"] : var.tier == "l" ? ["1", "2"] : null
    sku_name = lookup(
      {
        "s"  = "Developer_1",
        "m"  = "Standard_1",
        "l"  = "Premium_2",
        "xl" = "Premium_3"
      },
      var.tier,
      "Premium_1" # Default
    )

    log_category_groups = ["allLogs", "audit"]
    log_category_types  = ["DeveloperPortalAuditLogs", "GatewayLogs", "WebSocketConnectionLogs"]
  }

  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name != null ? var.private_dns_zone_resource_group_name : data.azurerm_virtual_network.this.resource_group_name
}
