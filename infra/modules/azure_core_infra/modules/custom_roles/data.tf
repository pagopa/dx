data "azurerm_subscription" "current" {
  count = var.subscription_id == null ? 0 : 1
}
