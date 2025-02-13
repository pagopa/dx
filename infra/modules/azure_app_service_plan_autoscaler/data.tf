data "azurerm_linux_web_app" "this" {
  for_each = toset(var.target_services.app_service_name != null ? var.target_services.app_service_name : [])

  resource_group_name = var.resource_group_name
  name                = each.value
}

data "azurerm_linux_function_app" "this" {
  for_each = toset(var.target_services.function_app_name != null ? var.target_services.function_app_name : [])

  resource_group_name = var.resource_group_name
  name                = each.value
}