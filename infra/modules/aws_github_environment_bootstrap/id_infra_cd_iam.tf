# Subscription
resource "azurerm_role_assignment" "infra_cd_subscription_reader" {
  scope                = var.subscription_id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to read resources at subscription scope"
}

resource "azurerm_role_assignment" "infra_cd_subscription_rbac_admin" {
  scope                = var.subscription_id
  role_definition_name = "Role Based Access Control Administrator"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to manage IAM roles at subscription scope"
}

# Resource Group
resource "azurerm_role_assignment" "infra_cd_rgs_contributor" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to apply changes to resources at ${each.value} resource group scope"
}

resource "azurerm_role_assignment" "infra_cd_rgs_user_access_admin" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "User Access Administrator"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to manage locks at ${each.value} resource group scope"
}

# VNet
resource "azurerm_role_assignment" "infra_cd_vnet_network_contributor" {
  scope                = var.pep_vnet_id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to manage Private Endpoints at VNet scope"
}

# Private DNS Zone
resource "azurerm_role_assignment" "infra_cd_rg_private_dns_zone_contributor" {
  scope                = var.private_dns_zone_resource_group_id
  role_definition_name = "Private DNS Zone Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to manage Private DNS Zones at resource group level"
}

resource "azurerm_role_assignment" "infra_cd_rg_network_contributor" {
  scope                = var.private_dns_zone_resource_group_id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to associate Private DNS Zones and Private Endpoints at resource group level"
}

# NAT Gateway
resource "azurerm_role_assignment" "infra_cd_rg_nat_gw_network_contributor" {
  count = (var.private_dns_zone_resource_group_id == var.nat_gateway_resource_group_id) || (var.nat_gateway_resource_group_id == null) ? 0 : 1 # avoid duplicated assignment on the same rg

  scope                = var.nat_gateway_resource_group_id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to associate NAT Gateways to subnets at resource group level"
}

# Api Management
resource "azurerm_role_assignment" "infra_cd_apim_service_contributor" {
  count = local.has_apim

  scope                = var.apim_id
  role_definition_name = "API Management Service Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to manage configuration at APIM scope"
}

# Log Analytics Workspace
resource "azurerm_role_assignment" "infra_cd_log_analytics_workspace_contributor" {
  count = local.has_log_analytics_workspace

  scope                = var.log_analytics_workspace_id
  role_definition_name = "Log Analytics Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to manage configuration at Log Analytics Workspace scope"
}

# Storage Account - Terraform state file
resource "azurerm_role_assignment" "infra_cd_st_tf_blob_contributor" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to apply changes to the Terraform state file Storage Account scope"
}

# Key Vault
resource "azurerm_role_assignment" "infra_cd_rgs_kv_secr" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to changes to KeyVault's secrets at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_cd_rgs_kv_cert" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "Key Vault Certificates Officer"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to change KeyVault's certificates at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_cd_rgs_kv_crypto" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "Key Vault Crypto Officer"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to change KeyVault's keys at monorepository resource group scope"
}

resource "azurerm_key_vault_access_policy" "infra_cd_kv_common" {
  for_each = toset(var.keyvault_common_ids)

  key_vault_id = each.key
  tenant_id    = var.tenant_id
  object_id    = azurerm_user_assigned_identity.infra_cd.principal_id

  secret_permissions = ["Get", "List", "Set"]
}

# Storage Account - Blob, Queue and Table
resource "azurerm_role_assignment" "infra_cd_rgs_st_blob_contributor" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to write Storage Account blobs monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_ci_rgs_st_queue_contributor" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to write Storage Account queues monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_ci_rgs_st_table_contributor" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "Storage Table Data Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to write Storage Account tables monorepository resource group scope"
}
