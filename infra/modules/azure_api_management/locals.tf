locals {
  prefix = var.environment.app_name != "apim" ? module.naming_convention.prefix : var.environment.domain != null ? "${module.naming_convention.project}-${var.environment.domain}" : module.naming_convention.project
  apim = {
    name           = "${local.prefix}-apim-${module.naming_convention.suffix}"
    autoscale_name = contains(["l", "xl"], var.tier) ? "${local.prefix}-apim-as-${module.naming_convention.suffix}" : null
    zones          = length(var.zones_override) > 0 ? var.zones_override : ["1", "2", "3"]
    sku_name = lookup(
      {
        "s"  = "Developer_1",
        "m"  = "Standard_1",
        "l"  = "Premium_1",
        "xl" = "Premium_2"
      },
      var.tier,
      "Premium_1" # Default
    )
  }
}