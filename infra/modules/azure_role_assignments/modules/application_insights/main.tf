resource "azurerm_role_assignment" "this" {
  for_each             = { for ai in local.norm_application_insights : "${ai.resource_group_name}|${ai.name}" => ai }
  role_definition_name = "Monitoring Metrics Publisher"
  scope                = each.value.id
  principal_id         = var.principal_id
  description          = each.value.description
}
