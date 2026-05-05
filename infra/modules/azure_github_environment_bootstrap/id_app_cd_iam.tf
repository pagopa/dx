# Subscription
resource "azurerm_role_assignment" "app_cd_subscription_reader" {
  scope                = var.subscription_id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.app_cd.principal_id
  description          = "Allow ${var.repository.name} App CD identity to read resources at subscription scope"
}

# Resource Group
resource "azurerm_role_assignment" "app_cd_rgs_deploy" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_id   = try(var.custom_role_definition_ids.dx_app_cd_resource_groups, null)
  role_definition_name = try(var.custom_role_definition_ids.dx_app_cd_resource_groups, null) == null ? "DX App CD Resource Groups" : null
  principal_id         = azurerm_user_assigned_identity.app_cd.principal_id
  description          = "Allow ${var.repository.name} App CD identity to apply the DX deploy role at ${each.value} resource group scope"
}

resource "azurerm_role_assignment" "app_cd_tf_rg_blob_contributor" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.app_cd.principal_id
  description          = "Allow ${var.repository.name} App CD identity to apply changes to the Terraform state file Storage Account scope"
}
