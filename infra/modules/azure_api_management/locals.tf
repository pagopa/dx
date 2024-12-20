locals {
  apim = {
    name           = module.naming_convention.name.api_management["1"]
    autoscale_name = var.tier == "l" ? module.naming_convention.name.api_management_autoscale["1"] : null
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