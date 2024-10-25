resource "azurerm_user_assigned_identity" "app_cd" {
  resource_group_name = azurerm_resource_group.main.name
  location            = local.ids.location
  name                = format(local.ids.app_name, "cd")

  tags = var.tags
}

resource "azurerm_federated_identity_credential" "github_app_cd" {
  resource_group_name = azurerm_user_assigned_identity.app_cd.resource_group_name
  name                = format(local.ids.federated_identity_name, "app", "cd")
  audience            = local.ids.audience
  issuer              = local.ids.issuer
  parent_id           = azurerm_user_assigned_identity.app_cd.id
  subject             = "repo:pagopa/${var.repository_name}:environment:${format(local.ids.app_environment_name, "cd")}"
}

resource "azurerm_role_assignment" "app_cd_subscription_reader" {
  scope                = var.subscription_id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.app_cd.principal_id
}

resource "azurerm_role_assignment" "app_cd_rg_contributor" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.app_cd.principal_id
}

resource "azurerm_role_assignment" "app_cd_tf_rg_blob_contributor" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.app_cd.principal_id
}
