data "azurerm_subscription" "current" {}

data "azurerm_client_config" "current" {}

data "azuread_group" "admin" {
  display_name = local.adgroups.admin_name
}

data "azuread_group" "developers" {
  display_name = local.adgroups.devs_name
}

data "azuread_group" "externals" {
  display_name = local.adgroups.external_name
}
