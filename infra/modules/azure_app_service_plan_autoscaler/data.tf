data "azurerm_linux_web_app" "this" {
  count = try(var.target_service.app_service.id, null) == null && local.is_app_service ? 1 : 0

  resource_group_name = var.resource_group_name
  name                = var.target_service.app_service.name
}

data "azurerm_linux_function_app" "this" {
  count = try(var.target_service.function_app.id, null) == null && local.is_function_app ? 1 : 0

  resource_group_name = var.resource_group_name
  name                = var.target_service.function_app.name
}
