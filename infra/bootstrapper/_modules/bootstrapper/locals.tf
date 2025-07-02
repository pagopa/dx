locals {
  project = "${var.environment.prefix}-${var.environment.location_short}"

  location_short = {
    italynorth = "itn"
    westeurope = "weu"
  }[lower(var.environment.location)]

  adgroups = {
    admins_name   = "${local.project}-adgroup-admin"
    devs_name     = "${local.project}-adgroup-developers"
    external_name = "${local.project}-adgroup-externals"
  }

  tf_storage_account = {
    name                = "${var.environment.prefix}${local.location_short}tfstatest01"
    resource_group_name = "${local.project}-tfstate-rg-01"
  }
}

