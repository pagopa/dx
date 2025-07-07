locals {
  environment = {
    prefix          = "dx"
    location_short  = "itn"
    env_short       = "p"
    domain          = "devex"
    instance_number = "01"
  }

  project = "${local.environment.prefix}-${local.environment.env_short}-${local.environment.location_short}"
}
