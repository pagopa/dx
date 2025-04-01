locals {
  naming_config = {
    prefix      = var.environment.prefix,
    environment = var.environment.env_short,
    location = tomap({
      "italynorth" = "itn",
      "westeurope" = "weu"
    })[var.environment.location]
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  has_existing_subnet = var.subnet_id != null
}