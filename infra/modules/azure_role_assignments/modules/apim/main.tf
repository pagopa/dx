resource "azurerm_role_assignment" "this" {
  for_each             = { for apim in local.norm_apims : "${apim.resource_group_name}|${apim.name}|${apim.role}" => apim }
  role_definition_name = local.role_definition_name[lower(each.value.role)]
  scope                = each.value.id
  principal_id         = var.principal_id
  description          = each.value.description
}
