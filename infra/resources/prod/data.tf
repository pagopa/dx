data "azurerm_subscription" "dev-engineering" {
}

data "azurerm_subscription" "prod-io" {
  provider = azurerm.prod-io
}
