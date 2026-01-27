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

# Contributor role at subscription level with ABAC condition for managed resource groups
resource "azurerm_role_assignment" "infra_cd_subscription_contributor" {
  scope                = var.subscription_id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} Infra CD identity to apply changes to resources at managed resource group scopes"
}

# User Access Administrator role at subscription level with ABAC condition for managed resource groups
resource "azurerm_role_assignment" "infra_cd_subscription_user_access_admin" {
  scope                = var.subscription_id
  role_definition_name = "User Access Administrator"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} Infra CD identity to manage locks at managed resource group scopes"
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

# Service Bus
resource "azurerm_role_assignment" "infra_cd_sbns_contributor" {
  count = local.has_sbns

  scope                = var.sbns_id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to manage configuration at Service Bus Namespace scope"
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

# Key Vault roles at subscription level with ABAC condition for managed resource groups
resource "azurerm_role_assignment" "infra_cd_subscription_kv_secr" {
  scope                = var.subscription_id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} Infra CD identity to change KeyVault's secrets at managed resource group scopes"
}

resource "azurerm_role_assignment" "infra_cd_subscription_kv_cert" {
  scope                = var.subscription_id
  role_definition_name = "Key Vault Certificates Officer"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} Infra CD identity to change KeyVault's certificates at managed resource group scopes"
}

resource "azurerm_role_assignment" "infra_cd_subscription_kv_crypto" {
  scope                = var.subscription_id
  role_definition_name = "Key Vault Crypto Officer"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} Infra CD identity to change KeyVault's keys at managed resource group scopes"
}

resource "azurerm_key_vault_access_policy" "infra_cd_kv_common" {
  for_each = toset(var.keyvault_common_ids)

  key_vault_id = each.key
  tenant_id    = var.tenant_id
  object_id    = azurerm_user_assigned_identity.infra_cd.principal_id

  secret_permissions = ["Get", "List", "Set"]
}

# Storage Account - Blob, Queue and Table roles at subscription level with ABAC condition for managed resource groups
resource "azurerm_role_assignment" "infra_cd_subscription_st_blob_contributor" {
  scope                = var.subscription_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} Infra CD identity to write Storage Account blobs at managed resource group scopes"
}

resource "azurerm_role_assignment" "infra_cd_subscription_st_queue_contributor" {
  scope                = var.subscription_id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} Infra CD identity to write Storage Account queues at managed resource group scopes"
}

resource "azurerm_role_assignment" "infra_cd_subscription_st_table_contributor" {
  scope                = var.subscription_id
  role_definition_name = "Storage Table Data Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} Infra CD identity to write Storage Account tables at managed resource group scopes"
}

# Container App role at subscription level with ABAC condition for managed resource groups
resource "azurerm_role_assignment" "infra_cd_subscription_ca_contributor" {
  scope                = var.subscription_id
  role_definition_name = "Container Apps Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} Infra CD identity to apply changes to Container App configuration at managed resource group scopes"
}
