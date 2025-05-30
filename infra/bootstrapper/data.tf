#####################
##       DEV       ##
#####################

data "azurerm_subscription" "current_dev" {
  provider = azurerm.dev
}

data "azurerm_client_config" "current_dev" {
  provider = azurerm.dev
}

data "azuread_group" "admins_dev" {
  display_name = format(local.adgroups.admins_name, "d")
}

data "azuread_group" "developers_dev" {
  display_name = format(local.adgroups.devs_name, "d")
}

data "azuread_group" "externals_dev" {
  display_name = format(local.adgroups.external_name, "d")
}

#####################
##      PROD       ##
#####################

data "azurerm_subscription" "current_prod" {
  provider = azurerm.prod
}

data "azurerm_client_config" "current_prod" {
  provider = azurerm.prod
}

data "azuread_group" "admins_prod" {
  display_name = format(local.adgroups.admins_name, "p")
}

data "azuread_group" "developers_prod" {
  display_name = format(local.adgroups.devs_name, "p")
}

data "azuread_group" "externals_prod" {
  display_name = format(local.adgroups.external_name, "p")
}
