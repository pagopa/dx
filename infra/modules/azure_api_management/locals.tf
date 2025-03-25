locals {
  # Defines the naming prefix for APIM, dynamically handling cases where app_name 
  # is not "apim" or a domain is specified, to avoid redundant naming logic.
  prefix = var.environment.app_name != "apim" ? module.naming_convention.prefix : var.environment.domain != null ? "${module.naming_convention.project}-${var.environment.domain}" : module.naming_convention.project
  apim = {
    name           = var.autoscale.legacy_name == "" ? "${local.prefix}-apim-${module.naming_convention.suffix}" : var.autoscale.legacy_name
    autoscale_name = contains(["l", "xl"], var.tier) ? "${local.prefix}-apim-as-${module.naming_convention.suffix}" : null
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
  }

  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name != null ? var.private_dns_zone_resource_group_name : data.azurerm_virtual_network.this.resource_group_name
}