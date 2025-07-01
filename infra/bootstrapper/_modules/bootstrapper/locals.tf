locals {
  project = "${var.environment.prefix}-${var.environment.location_short}"

  tf_storage_account = {
    name                = "${var.environment.prefix}${var.environment.location_short}tfstatest01"
    resource_group_name = "${local.project}-tfstate-rg-01"
  }
}

