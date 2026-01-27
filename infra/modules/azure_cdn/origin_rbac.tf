# Role assignment for Front Door's managed identity to access the storage account origin
resource "azurerm_role_assignment" "origin_storage_blob_data_reader" {
  for_each = local.origins_with_rbac

  description          = "Grant Front Door Managed Identity access to storage account blob data"
  scope                = each.value.storage_account_id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = local.profile_identity_id

  lifecycle {
    precondition {
      condition     = each.value.storage_account_id != null
      error_message = "storage_account_id must be provided when use_managed_identity is true for origin '${each.key}'"
    }
  }
}
