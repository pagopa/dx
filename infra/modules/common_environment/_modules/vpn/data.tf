data "azurerm_client_config" "current" {}

data "azuread_client_config" "current" {}

# data "azuread_application" "vpn_app" {
#   display_name = "${var.project}-app-vpn"
# }