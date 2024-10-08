locals {
  apim = {
    name           = "${module.naming_convention.prefix}-apim-${module.naming_convention.suffix}"
    autoscale_name = var.tier == "l" ? "${module.naming_convention.prefix}-apim-autoscale-${module.naming_convention.suffix}" : null
    sku_name = lookup(
      {
        "s" = "Developer_1",
        "m" = "Standard_1",
        "l" = "Premium_1"
      },
      var.tier,
      "Premium_1" # Default or consider throwing an error
    )
  }
}