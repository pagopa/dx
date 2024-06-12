data "azurerm_linux_web_app" "this" {
  count = local.is_app_service ? 1 : 0

  resource_group_name = var.resource_group_name
  name                = var.app_service_name
}

data "azurerm_linux_function_app" "this" {
  count = local.is_function_app ? 1 : 0

  resource_group_name = var.resource_group_name
  name                = var.function_app_name
}
