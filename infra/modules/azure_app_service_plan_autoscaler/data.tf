data "azurerm_linux_web_app" "this" {
  for_each = {
    for idx, service in var.target_services :
    idx => service if service.app_service_name != null
  }

  resource_group_name = var.resource_group_name
  name                = each.value.app_service_name
}

data "azurerm_linux_function_app" "this" {
  for_each = {
    for idx, service in var.target_services :
    idx => service if service.function_app_name != null
  }

  resource_group_name = var.resource_group_name
  name                = each.value.function_app_name
}
