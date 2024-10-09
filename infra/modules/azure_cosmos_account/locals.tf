locals {
  location_map = {
    "italynorth"         = "itn"
    "westeurope"         = "weu"
    "germanywestcentral" = "gwc"
  }
  location_short  = lookup(local.location_map, var.environment.location, "itn")
  project         = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
  domain          = var.environment.domain == null ? "-" : "-${var.environment.domain}-"
  app_name_prefix = "${local.project}${local.domain}${var.environment.app_name}"

  primary_location = var.primary_geo_location.location == null ? var.environment.location : var.primary_geo_location.location
}