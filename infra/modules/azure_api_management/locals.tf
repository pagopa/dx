locals {
  # General
  location_short   = var.environment.location == "italynorth" ? "itn" : var.environment.location == "westeurope" ? "weu" : var.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project          = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
  domain           = var.environment.domain == null ? "-" : "-${var.environment.domain}-"
  apim_name_prefix = "${local.project}${local.domain}${var.environment.app_name}"

  apim = {
    name           = "${local.apim_name_prefix}-apim-${var.environment.instance_number}"
    autoscale_name = var.tier == "premium" ? "${local.apim_name_prefix}-apim-autoscale-${var.environment.instance_number}" : null
    sku_name       = var.tier == "test" ? "Developer_1" : var.tier == "standard" ? "Standard_1" : "Premium_1"
  }
}
