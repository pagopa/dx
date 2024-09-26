locals {
  # General
  location_map = {
    "italynorth"         = "itn",
    "westeurope"         = "weu",
    "germanywestcentral" = "gwc"
  }
  location_short   = lookup(local.location_map, var.environment.location, "neu")
  project          = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
  domain           = var.environment.domain == null ? "-" : "-${var.environment.domain}-"
  apim_name_prefix = "${local.project}${local.domain}${var.environment.app_name}"

  apim = {
    name           = "${local.apim_name_prefix}-apim-${var.environment.instance_number}"
    autoscale_name = var.tier == "premium" ? "${local.apim_name_prefix}-apim-autoscale-${var.environment.instance_number}" : null
    sku_name = lookup(
      {
        "test"     = "Developer_1",
        "standard" = "Standard_1",
        "premium"  = "Premium_1"
      },
      var.tier,
      "Premium_1" # Default or consider throwing an error
    )
  }
}