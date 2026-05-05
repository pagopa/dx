# Subscription
resource "azurerm_role_assignment" "app_ci_subscription_reader" {
  scope                = var.subscription_id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.app_ci.principal_id
  description          = "Allow ${var.repository.name} App CI identity to read resources at subscription scope"
}

# Resource Group
resource "azurerm_role_assignment" "app_ci_rgs_reader" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_id   = try(var.custom_role_definition_ids.dx_app_ci_resource_groups, null)
  role_definition_name = try(var.custom_role_definition_ids.dx_app_ci_resource_groups, null) == null ? "DX App CI Resource Groups" : null
  principal_id         = azurerm_user_assigned_identity.app_ci.principal_id
  description          = "Allow ${var.repository.name} App CI identity to read DX repository resources at ${each.value} resource group scope"
}
