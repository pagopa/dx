data "azurerm_container_app_environment" "runner" {
  name                = var.container_app_environment.name
  resource_group_name = var.container_app_environment.resource_group_name
}

data "azurerm_key_vault" "kv" {
  name                = var.key_vault.name
  resource_group_name = var.key_vault.resource_group_name
}
