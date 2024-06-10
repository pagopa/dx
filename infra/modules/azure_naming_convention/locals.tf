locals {
  location_short       = var.environment.location == "italynorth" ? "itn" : var.environment.location == "westeurope" ? "weu" : var.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project              = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
  resource_name_prefix = "${local.project}-${var.environment.domain}-${var.environment.app_name}"
}
