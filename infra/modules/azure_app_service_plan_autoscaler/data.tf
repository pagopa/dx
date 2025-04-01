data "azurerm_linux_web_app" "this" {
  count = local.is_name_provided && local.is_app_service ? 1 : 0

  resource_group_name = var.resource_group_name
  name                = var.target_service.app_service.name
}

data "azurerm_linux_function_app" "this" {
  count = local.is_name_provided && local.is_function_app ? 1 : 0

  resource_group_name = var.resource_group_name
  name                = var.target_service.function_app.name
}
