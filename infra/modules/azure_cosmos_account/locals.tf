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

  abbreviations = {
    sql = "cosmos"
    cassandra = "coscas"
    mongo = "cosmon"
    nosql = "cosno"
    table = "costab"
    gremlin = "cosgrm"
    postgres = "cospos"
  }
}