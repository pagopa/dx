# Subscription
resource "azurerm_role_assignment" "app_cd_subscription_reader" {
  scope                = var.subscription_id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.app_cd.principal_id
  description          = "Allow ${var.repository.name} App CD identity to read resources at subscription scope"
}

# Resource Group
resource "azurerm_role_assignment" "app_cd_rgs_website_contributor" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "Website Contributor"
  principal_id         = azurerm_user_assigned_identity.app_cd.principal_id
  description          = "Allow ${var.repository.name} App CD identity to deploy code to AppService and Function Apps at ${each.value} resource group scope"
}

resource "azurerm_role_assignment" "app_cd_rgs_cdn_profile_contributor" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "CDN Profile Contributor"
  principal_id         = azurerm_user_assigned_identity.app_cd.principal_id
  description          = "Allow ${var.repository.name} App CD identity to apply purge CDNs at ${each.value} resource group scope"
}

resource "azurerm_role_assignment" "app_cd_rgs_cae_contributor" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "Container Apps Contributor"
  principal_id         = azurerm_user_assigned_identity.app_cd.principal_id
  description          = "Allow ${var.repository.name} App CD identity to apply changes to Container App Environment at ${each.value} resource group scope"
}

resource "azurerm_role_assignment" "app_cd_rgs_blob_contributor" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.app_cd.principal_id
  description          = "Allow ${var.repository.name} App CD identity to apply changes to resources at ${each.value} resource group scope"
}

resource "azurerm_role_assignment" "app_cd_tf_rg_blob_contributor" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.app_cd.principal_id
  description          = "Allow ${var.repository.name} App CD identity to apply changes to the Terraform state file Storage Account scope"
}
