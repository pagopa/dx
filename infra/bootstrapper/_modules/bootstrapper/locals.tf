locals {
  project = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"

  location_short = {
    italynorth = "itn"
    westeurope = "weu"
  }[lower(var.environment.location)]

  env_long = {
    d = "dev"
    p = "prod"
  }[lower(var.environment.env_short)]

  adgroups = {
    admins_name   = "${var.environment.prefix}-${var.environment.env_short}-adgroup-admin"
    devs_name     = "${var.environment.prefix}-${var.environment.env_short}-adgroup-developers"
    external_name = "${var.environment.prefix}-${var.environment.env_short}-adgroup-externals"
  }

  tf_storage_account = {
    name                = replace("${local.project}tfstatest01", "-", "")
    resource_group_name = "${local.project}-tfstate-rg-01"
  }
}

