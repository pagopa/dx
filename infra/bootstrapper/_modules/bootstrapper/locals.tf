locals {
  project = "${var.environment.prefix}-${var.environment.location_short}"

  opex_rg_name = "${local.project}-opex-rg-01"

  adgroups = {
    admins_name   = "${local.project}-adgroup-admin"
    devs_name     = "${local.project}-adgroup-developers"
    external_name = "${local.project}-adgroup-externals"
  }

  common = {
    resource_group_name = "${local.project}-common-rg-01"
  }

  vnet = {
    name                = "${local.project}-common-vnet-01"
    resource_group_name = "${local.project}-network-rg-01"
  }

  tf_storage_account = {
    name                = "${var.environment.prefix}${var.environment.location_short}tfstatest01"
    resource_group_name = "${local.project}-tfstate-rg-01"
  }
}

