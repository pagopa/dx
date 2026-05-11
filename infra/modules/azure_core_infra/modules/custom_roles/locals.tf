locals {
  subscription_id   = var.subscription_id != null ? trimspace(var.subscription_id) : data.azurerm_subscription.current[0].id
  subscription_name = var.subscription_name != null ? trimspace(var.subscription_name) : data.azurerm_subscription.current[0].display_name

  subscription_role_name_prefix = local.subscription_name
}
