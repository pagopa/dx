data "azurerm_subscription" "current" {
  count           = var.subscription_id == null || var.subscription_name == null ? 1 : 0
  subscription_id = var.subscription_id == null ? null : trimspace(var.subscription_id)
}
