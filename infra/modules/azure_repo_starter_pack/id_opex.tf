resource "azurerm_user_assigned_identity" "opex_ci" {
  resource_group_name = azurerm_resource_group.main.name
  location            = local.ids.location
  name                = format(local.ids.opex_name, "ci")

  tags = var.tags
}

resource "azurerm_user_assigned_identity" "opex_cd" {
  resource_group_name = azurerm_resource_group.main.name
  location            = local.ids.location
  name                = format(local.ids.opex_name, "cd")

  tags = var.tags
}

resource "azurerm_federated_identity_credential" "github_opex_ci" {
  resource_group_name = azurerm_user_assigned_identity.opex_ci.resource_group_name
  name                = format(local.ids.federated_identity_name, "opex", "ci")
  audience            = local.ids.audience
  issuer              = local.ids.issuer
  parent_id           = azurerm_user_assigned_identity.opex_ci.id
  subject             = "repo:pagopa/${var.repository.name}:environment:${format(local.ids.opex_environment_name, "ci")}"
}

resource "azurerm_federated_identity_credential" "github_opex_cd" {
  resource_group_name = azurerm_user_assigned_identity.opex_cd.resource_group_name
  name                = format(local.ids.federated_identity_name, "opex", "cd")
  audience            = local.ids.audience
  issuer              = local.ids.issuer
  parent_id           = azurerm_user_assigned_identity.opex_cd.id
  subject             = "repo:pagopa/${var.repository.name}:environment:${format(local.ids.opex_environment_name, "cd")}"
}

resource "azurerm_role_assignment" "opex_ci_subscription_reader" {
  scope                = var.subscription_id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.opex_ci.principal_id
}

resource "azurerm_role_assignment" "opex_ci_tf_rg_blob_reader" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azurerm_user_assigned_identity.opex_ci.principal_id
}

resource "azurerm_role_assignment" "opex_ci_subscription_data_access" {
  scope                = var.subscription_id
  role_definition_name = "Reader and Data Access"
  principal_id         = azurerm_user_assigned_identity.opex_ci.principal_id
}

resource "azurerm_role_assignment" "opex_cd_subscription_reader" {
  scope                = var.subscription_id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.opex_cd.principal_id
}

resource "azurerm_role_assignment" "opex_cd_tf_rg_blob_contributor" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.opex_cd.principal_id
}

resource "azurerm_role_assignment" "opex_cd_tf_rg_blob_data_access" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Reader and Data Access"
  principal_id         = azurerm_user_assigned_identity.opex_cd.principal_id
}

resource "azurerm_role_assignment" "opex_cd_rg_opex_contributor" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "PagoPA Opex Dashboards Contributor"
  principal_id         = azurerm_user_assigned_identity.opex_cd.principal_id
}
