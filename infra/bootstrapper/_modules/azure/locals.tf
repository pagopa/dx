locals {
  project = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"

  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    domain          = var.environment.domain,
    location        = var.environment.location,
    instance_number = tonumber(var.environment.instance_number),
  }

  location_short = {
    italynorth = "itn"
    westeurope = "weu"
  }[lower(var.environment.location)]

  env_long = {
    d = "dev"
    u = "uat"
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
  tf_storage_account_id = "/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/${local.tf_storage_account.resource_group_name}/providers/Microsoft.Storage/storageAccounts/${local.tf_storage_account.name}"
}

