# Subscription
resource "azurerm_role_assignment" "infra_cd_subscription_rbac_admin" {
  scope                = var.subscription_id
  role_definition_name = "PagoPA DX Infra CD Subscription Admin"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to manage the DX subscription admin bundle"
}

# Resource Group
resource "azurerm_role_assignment" "infra_cd_rgs_deploy" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "PagoPA DX Infra CD Resource Group Deploy"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to apply the DX deploy role at ${each.value} resource group scope"
}

# VNet
resource "azurerm_role_assignment" "infra_cd_vnet_network_contributor" {
  scope                = var.pep_vnet_id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to manage Private Endpoints at VNet scope"
}

# Private DNS Zone
resource "azurerm_role_assignment" "infra_cd_rg_private_networking" {
  scope                = var.private_dns_zone_resource_group_id
  role_definition_name = "PagoPA DX Infra CD Private Networking"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to manage the DX private networking bundle at resource group level"
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

resource "azurerm_key_vault_access_policy" "infra_cd_kv_common" {
  for_each = toset(var.keyvault_common_ids)

  key_vault_id = each.key
  tenant_id    = var.tenant_id
  object_id    = azurerm_user_assigned_identity.infra_cd.principal_id

  secret_permissions = ["Get", "List", "Set"]
}

# Storage Account - Blob, Queue and Table
