data "azurerm_client_config" "current" {}

data "azurerm_subscription" "current" {}

data "azuread_application" "psn_hsm_01" {
  display_name = "psn-d-hsm"
}
