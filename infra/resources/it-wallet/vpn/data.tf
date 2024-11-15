data "azurerm_client_config" "current" {}

data "azurerm_subscription" "current" {}

data "azuread_application" "vpn_app_01" {
  display_name = "ps-d-itn-vpn-app-01"
}
