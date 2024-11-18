locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  location_map = {
    "italynorth"         = "itn",
    "westeurope"         = "weu",
    "germanywestcentral" = "gwc"
    "spaincentral"       = "spc"
  }

  location_short = lookup(local.location_map, local.environment.location, "neu")
  project        = "${local.environment.prefix}-${local.environment.env_short}-${local.location_short}"


}
