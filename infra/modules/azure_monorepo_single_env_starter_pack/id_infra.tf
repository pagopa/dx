resource "azurerm_user_assigned_identity" "infra_ci" {
  resource_group_name = azurerm_resource_group.main.name
  location            = local.ids.location
  name                = format(local.ids.infra_name, "ci")

  tags = var.tags
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
}

resource "azurerm_role_assignment" "infra_ci_subscription_data_access" {
  scope                = var.subscription_id
  role_definition_name = "Reader and Data Access"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
}

resource "azurerm_role_assignment" "infra_ci_subscription_pagopa_iac_reader" {
  scope                = var.subscription_id
  role_definition_name = "PagoPA IaC Reader"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
}

resource "azurerm_role_assignment" "infra_ci_subscription_cosmos_contributor" {
  scope                = var.subscription_id
  role_definition_name = "DocumentDB Account Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
}

resource "azurerm_role_assignment" "infra_ci_tf_st_blob_contributor" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
}

resource "azurerm_role_assignment" "infra_ci_rg_kv_secr" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
}

resource "azurerm_role_assignment" "infra_ci_rg_kv_cert" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Key Vault Certificate User"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
}

resource "azurerm_role_assignment" "infra_cd_subscription_reader" {
  scope                = var.subscription_id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
}

resource "azurerm_role_assignment" "infra_cd_rg_contributor" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
}

resource "azurerm_role_assignment" "infra_cd_vnet_network_contributor" {
  scope                = var.pep_vnet_id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
}

resource "azurerm_role_assignment" "infra_cd_apim_service_contributor" {
  scope                = var.apim_id
  role_definition_name = "API Management Service Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
}

resource "azurerm_role_assignment" "infra_cd_st_tf_blob_contributor" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
}

resource "azurerm_role_assignment" "infra_cd_rg_rbac_admin" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Role Based Access Control Administrator"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
}

resource "azurerm_role_assignment" "infra_cd_rg_kv_secr" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
}

resource "azurerm_role_assignment" "infra_cd_rg_kv_cert" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Key Vault Certificates Officer"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
}

