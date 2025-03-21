locals {
  apim = {
    name           = "${module.naming_convention.prefix}-apim-${module.naming_convention.suffix}"
    autoscale_name = var.tier == "l" ? "${module.naming_convention.prefix}-apim-as-${module.naming_convention.suffix}" : null
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