data "azurerm_linux_web_app" "this" {
  for_each = var.target_services.app_service == null ? {} : {
    for s in var.target_services.app_service : 
    s.name => s.name if length(keys(s)) == 1 && contains(keys(s), "name")
  }

  resource_group_name = var.resource_group_name
  name                = each.value
}

data "azurerm_linux_function_app" "this" {
  for_each = var.target_services.function_app == null ? {} : {
    for s in var.target_services.function_app : 
    s.name => s.name if length(keys(s)) == 1 && contains(keys(s), "name")
  }

  resource_group_name = var.resource_group_name
  name                = each.value
}