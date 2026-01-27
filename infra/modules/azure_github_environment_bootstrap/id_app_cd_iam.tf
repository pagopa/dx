# Subscription
resource "azurerm_role_assignment" "app_cd_subscription_reader" {
  scope                = var.subscription_id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.app_cd.principal_id
  description          = "Allow ${var.repository.name} App CD identity to read resources at subscription scope"
}

# Website Contributor role at subscription level with ABAC condition for managed resource groups
resource "azurerm_role_assignment" "app_cd_subscription_website_contributor" {
  scope                = var.subscription_id
  role_definition_name = "Website Contributor"
  principal_id         = azurerm_user_assigned_identity.app_cd.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} App CD identity to deploy code to AppService and Function Apps at managed resource group scopes"
}

# CDN Profile Contributor role at subscription level with ABAC condition for managed resource groups
resource "azurerm_role_assignment" "app_cd_subscription_cdn_profile_contributor" {
  scope                = var.subscription_id
  role_definition_name = "CDN Profile Contributor"
  principal_id         = azurerm_user_assigned_identity.app_cd.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} App CD identity to apply purge CDNs at managed resource group scopes"
}

# Container Apps Contributor role at subscription level with ABAC condition for managed resource groups
resource "azurerm_role_assignment" "app_cd_subscription_cae_contributor" {
  scope                = var.subscription_id
  role_definition_name = "Container Apps Contributor"
  principal_id         = azurerm_user_assigned_identity.app_cd.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} App CD identity to apply changes to Container App Environment at managed resource group scopes"
}

# Storage Blob Data Contributor role at subscription level with ABAC condition for managed resource groups
resource "azurerm_role_assignment" "app_cd_subscription_blob_contributor" {
  scope                = var.subscription_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.app_cd.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} App CD identity to apply changes to resources at managed resource group scopes"
}

resource "azurerm_role_assignment" "app_cd_tf_rg_blob_contributor" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.app_cd.principal_id
  description          = "Allow ${var.repository.name} App CD identity to apply changes to the Terraform state file Storage Account scope"
}

# PagoPA Static Web Apps List Secrets role at subscription level with ABAC condition for managed resource groups
resource "azurerm_role_assignment" "app_cd_subscription_static_webapp_secrets" {
  scope                = var.subscription_id
  role_definition_name = "PagoPA Static Web Apps List Secrets"
  principal_id         = azurerm_user_assigned_identity.app_cd.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} App CD identity to read Static Web Apps secrets at managed resource group scopes"
}
