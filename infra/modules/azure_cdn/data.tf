data "azurerm_client_config" "current" {}

data "azuread_service_principal" "frontdoor" {
  display_name = "Microsoft.AzurefrontDoor-Cdn"
}
