resource "azurerm_role_assignment" "this" {
  for_each             = { for apim in var.apim : "${apim.resource_group_name}|${apim.name}|${apim.role}" => apim }
  role_definition_name = local.role_definition_name[lower(each.value.role)]
  scope                = coalesce(each.value.id, data.azurerm_api_management.this["${each.value.resource_group_name}|${each.value.name}"].id)
  principal_id         = var.principal_id
}
