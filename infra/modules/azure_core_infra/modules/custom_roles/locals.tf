locals {
  subscription_id   = var.subscription_id != null ? var.subscription_id : data.azurerm_subscription.current[0].subscription_id
  subscription_name = var.subscription_name != null ? var.subscription_name : data.azurerm_subscription.current[0].display_name

  subscription_role_name_prefix = trimspace(local.subscription_name)
}
