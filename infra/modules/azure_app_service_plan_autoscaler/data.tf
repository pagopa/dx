data "azurerm_linux_web_app" "app_services" {
  for_each = {
    for app_service in var.target_service.app_services :
    app_service.name => app_service
    if app_service.name != null
  }

  resource_group_name = var.resource_group_name
  name                = each.key
}

data "azurerm_linux_function_app" "function_apps" {
  for_each = {
    for function_app in var.target_service.function_apps :
    function_app.name => function_app
    if function_app.name != null
  }

  resource_group_name = var.resource_group_name
  name                = each.key
}
