# subscription roles defined in `eng-azure-authorization` repo

resource "azurerm_role_assignment" "admins_group_rg" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Owner"
  principal_id         = data.azuread_group.admins.object_id
}

resource "azurerm_role_assignment" "admins_group_tf_rg" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = data.azuread_group.admins.object_id
}

resource "azurerm_role_assignment" "devs_group_rg" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Contributor"
  principal_id         = data.azuread_group.devs.object_id
}

resource "azurerm_role_assignment" "devs_group_tf_rg" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = data.azuread_group.devs.object_id
}

resource "azurerm_role_assignment" "externals_group_rg" {
  count = var.entraid_groups.externals == null ? 0 : 1

  scope                = azurerm_resource_group.main.id
  role_definition_name = "Reader"
  principal_id         = data.azuread_group.externals[0].object_id
}

resource "azurerm_role_assignment" "externals_group_tf_rg" {
  count = var.entraid_groups.externals == null ? 0 : 1

  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = data.azuread_group.externals[0].object_id
}
