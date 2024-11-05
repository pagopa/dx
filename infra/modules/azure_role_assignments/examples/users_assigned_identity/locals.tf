locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  location_short = local.environment.location == "italynorth" ? "itn" : local.environment.location == "westeurope" ? "weu" : local.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project        = "${local.environment.prefix}-${local.environment.env_short}-${local.location_short}"


}