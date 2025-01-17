data "azurerm_api_management" "this" {
  for_each = { for apim in local.apims : "${apim.resource_group_name}|${apim.name}" => apim }

  name                = each.value.name
  resource_group_name = each.value.resource_group_name
}
