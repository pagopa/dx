locals {
  location_short = {
    italynorth = "itn"
    westeurope = "weu"
  }[var.environment.location]

  project = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
}
