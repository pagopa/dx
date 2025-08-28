data "azurerm_subscription" "current" {}

data "azurerm_client_config" "current" {}

data "azuread_group" "admins" {
  display_name = local.adgroups.admins_name
}

data "azuread_group" "developers" {
  display_name = local.adgroups.devs_name
}

data "azuread_group" "externals" {
  display_name = local.adgroups.external_name
}

data "azurerm_resource_group" "tfstate" {
  count = var.environment.env_short == "d" ? 1 : 0
  name  = "dx-d-itn-tfstate-rg-01"
}
