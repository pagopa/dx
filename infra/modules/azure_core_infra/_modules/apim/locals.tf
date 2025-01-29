locals {
  apim = {
    name           = "${var.prefix}-apim-${var.suffix}"
    autoscale_name = var.tier == "l" ? "${var.prefix}-apim-as-${var.suffix}" : null
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