locals {
  # General
  location_map = {
    "italynorth"         = "itn",
    "westeurope"         = "weu",
    "germanywestcentral" = "gwc"
  }

  location_short = lookup(local.location_map, var.environment.location, "neu")
  project        = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
  domain         = var.environment.domain == null ? "-" : "-${var.environment.domain}-"

  app_prefix = "${local.project}${local.domain}${var.environment.app_name}"
  app_suffix = var.environment.instance_number
}