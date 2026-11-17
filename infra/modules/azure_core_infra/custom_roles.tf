module "custom_roles" {
  source = "./modules/custom_roles"

  subscription_id   = data.azurerm_subscription.current.id
  subscription_name = data.azurerm_subscription.current.display_name
}
