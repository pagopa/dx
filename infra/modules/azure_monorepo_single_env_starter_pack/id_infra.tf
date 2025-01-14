resource "azurerm_user_assigned_identity" "infra_ci" {
  resource_group_name = azurerm_resource_group.main.name
  location            = local.ids.location
  name                = format(local.ids.infra_name, "ci")

  tags = var.tags
}

resource "azuread_directory_role_assignment" "directory_readers" {
  role_id             = "88d8e3e3-8f55-4a1e-953a-9b9898b8876b" # Directory Readers role ID
  principal_object_id = azurerm_user_assigned_identity.infra_ci.principal_id
}

resource "azurerm_user_assigned_identity" "infra_cd" {
  resource_group_name = azurerm_resource_group.main.name
  location            = local.ids.location
  name                = format(local.ids.infra_name, "cd")

  tags = var.tags
}

resource "azurerm_federated_identity_credential" "github_infra_ci" {
  resource_group_name = azurerm_user_assigned_identity.infra_ci.resource_group_name
  name                = format(local.ids.federated_identity_name, "infra", "ci")
  audience            = local.ids.audience
  issuer              = local.ids.issuer
  parent_id           = azurerm_user_assigned_identity.infra_ci.id
  subject             = "repo:pagopa/${var.repository.name}:environment:${format(local.ids.infra_environment_name, "ci")}"
}

resource "azurerm_federated_identity_credential" "github_infra_cd" {
  resource_group_name = azurerm_user_assigned_identity.infra_cd.resource_group_name
  name                = format(local.ids.federated_identity_name, "infra", "cd")
  audience            = local.ids.audience
  issuer              = local.ids.issuer
  parent_id           = azurerm_user_assigned_identity.infra_cd.id
  subject             = "repo:pagopa/${var.repository.name}:environment:${format(local.ids.infra_environment_name, "cd")}"
}

resource "azurerm_role_assignment" "infra_ci_subscription_reader" {
  scope                = var.subscription_id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read resources at subscription scope"
}

resource "azurerm_role_assignment" "infra_ci_subscription_data_access" {
  scope                = var.subscription_id
  role_definition_name = "Reader and Data Access"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read resources' keys and data at subscription scope"
}

resource "azurerm_role_assignment" "infra_ci_subscription_pagopa_iac_reader" {
  scope                = var.subscription_id
  role_definition_name = "PagoPA IaC Reader"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read resources configuration at subscription scope"
}

resource "azurerm_role_assignment" "infra_ci_subscription_cosmos_contributor" {
  scope                = var.subscription_id
  role_definition_name = "DocumentDB Account Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read Cosmos DB configuration at subscription scope"
}

resource "azurerm_role_assignment" "infra_ci_tf_st_blob_contributor" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to apply changes to the Terraform state file Storage Account scope"
}

resource "azurerm_role_assignment" "infra_ci_rg_kv_secr" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read KeyVault's secrets at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_ci_rg_kv_cert" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Key Vault Certificate User"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read KeyVault's certificates at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_ci_rg_kv_crypto" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Key Vault Crypto User"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read KeyVault's keys at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_ci_rg_st_blob_reader" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read Storage Account blobs monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_ci_rg_st_queue_reader" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Storage Queue Data Reader"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read Storage Account queues monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_ci_rg_ext_pagopa_dns_reader" {
  scope                = var.dns_zone_resource_group_id
  role_definition_name = "PagoPA DNS Zone Reader"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read DNS Zone records at resource group level"
}

resource "azurerm_key_vault_access_policy" "infra_ci_kv_common" {
  for_each = toset(var.keyvault_common_ids)

  key_vault_id = each.key
  tenant_id    = var.tenant_id
  object_id    = azurerm_user_assigned_identity.infra_ci.principal_id

  secret_permissions = ["Get", "List"]
}

resource "azurerm_role_assignment" "infra_cd_subscription_reader" {
  scope                = var.subscription_id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to read resources at subscription scope"
}

resource "azurerm_role_assignment" "infra_cd_rg_contributor" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to apply changes to resources at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_cd_vnet_network_contributor" {
  scope                = var.pep_vnet_id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to manage Private Endpoints at VNet scope"
}

resource "azurerm_role_assignment" "infra_cd_apim_service_contributor" {
  count = local.has_apim

  scope                = var.apim_id
  role_definition_name = "API Management Service Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to manage configuration at APIM scope"
}

resource "azurerm_role_assignment" "infra_cd_st_tf_blob_contributor" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to apply changes to the Terraform state file Storage Account scope"
}

resource "azurerm_role_assignment" "infra_cd_rg_rbac_admin" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Role Based Access Control Administrator"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to manage IAM configuration at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_cd_rg_kv_secr" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to changes to KeyVault's secrets at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_cd_rg_kv_cert" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Key Vault Certificates Officer"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to change KeyVault's certificates at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_cd_rg_kv_crypto" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Key Vault Crypto Officer"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to change KeyVault's keys at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_cd_rg_st_blob_contributor" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to write Storage Account blobs monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_ci_rg_st_queue_contributor" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to write Storage Account queues monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_cd_rg_ext_network_contributor" {
  scope                = var.dns_zone_resource_group_id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to manage DNS Zones at resource group level"
}

resource "azurerm_key_vault_access_policy" "infra_cd_kv_common" {
  for_each = toset(var.keyvault_common_ids)

  key_vault_id = each.key
  tenant_id    = var.tenant_id
  object_id    = azurerm_user_assigned_identity.infra_cd.principal_id

  secret_permissions = ["Get", "List", "Set"]
}
