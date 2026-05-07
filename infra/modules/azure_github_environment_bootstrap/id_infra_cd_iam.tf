# Subscription
resource "azurerm_role_assignment" "infra_cd_subscription_rbac_admin" {
  scope              = data.azurerm_subscription.current.id
  role_definition_id = data.azurerm_role_definition.dx_infra_cd_subscription.id
  principal_id       = azurerm_user_assigned_identity.infra_cd.principal_id
  description        = "Allow ${var.repository.name} Infra CD identity to manage the DX subscription admin bundle"
}

# Resource Group
resource "azurerm_role_assignment" "infra_cd_rgs_deploy" {
  for_each = local.resource_group_ids

  scope              = each.value
  role_definition_id = data.azurerm_role_definition.dx_infra_cd_resource_groups.id
  principal_id       = azurerm_user_assigned_identity.infra_cd.principal_id
  description        = "Allow ${var.repository.name} Infra CD identity to apply the DX deploy role at ${each.value} resource group scope"
}

# Private DNS Zone
resource "azurerm_role_assignment" "infra_cd_rg_private_networking" {
  scope              = var.private_dns_zone_resource_group_id
  role_definition_id = data.azurerm_role_definition.dx_infra_cd_private_networking.id
  principal_id       = azurerm_user_assigned_identity.infra_cd.principal_id
  description        = "Allow ${var.repository.name} Infra CD identity to manage the DX private networking bundle at resource group level"
}

# Storage Account - Terraform state file
resource "azurerm_role_assignment" "infra_cd_st_tf_blob_contributor" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to apply changes to the Terraform state file Storage Account scope"
}
