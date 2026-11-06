# Subscription
resource "azurerm_role_assignment" "app_ci_subscription_reader" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.app_ci.principal_id
  description          = "Allow ${var.repository.name} App CI identity to read resources at subscription scope"
}

resource "azurerm_role_assignment" "app_ci_tf_state_blob_contributor" {
  count = var.terraform_state_container_access == null ? 0 : 1

  scope                = local.terraform_state_scope
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.app_ci.principal_id
  description          = "Allow ${var.repository.name} App CI identity to manage Terraform state at ${local.terraform_state_scope} scope"
}

# Resource Group
resource "azurerm_role_assignment" "app_ci_rgs_reader" {
  for_each = local.resource_group_ids

  scope              = each.value
  role_definition_id = data.azurerm_role_definition.dx_app_ci_resource_groups.id
  principal_id       = azurerm_user_assigned_identity.app_ci.principal_id
  description        = "Allow ${var.repository.name} App CI identity to read DX repository resources at ${each.value} resource group scope"
}
