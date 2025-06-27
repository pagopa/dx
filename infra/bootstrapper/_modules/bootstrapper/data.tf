data "azurerm_subscription" "current" {}

data "azurerm_client_config" "current" {}

data "azuread_group" "admins" {
  display_name = var.adgroups.admins_name
}

data "azuread_group" "developers" {
  display_name = var.adgroups.devs_name
}

data "azuread_group" "externals" {
  display_name = var.adgroups.external_name
}
