module "blob_rw_without_delete" {
  source = "../.."

  scope     = module.storage_account.id
  role_name = local.role_names.merged_limited
  source_roles = [
    azurerm_role_definition.source_blob_rw_without_delete.name,
  ]

  description = "Merged role used by the limited probe identity for Blob read/write without delete."

  depends_on = [
    azurerm_role_definition.source_blob_rw_without_delete,
  ]
}

module "blob_rw_with_delete_restored" {
  source = "../.."

  scope     = module.storage_account.id
  role_name = local.role_names.merged_full
  source_roles = [
    azurerm_role_definition.source_blob_rw_without_delete.name,
    azurerm_role_definition.source_blob_delete_only.name,
  ]

  description = "Merged role used by the full probe identity where delete is restored by a second permission block."

  depends_on = [
    azurerm_role_definition.source_blob_rw_without_delete,
    azurerm_role_definition.source_blob_delete_only,
  ]
}

module "container_rw_without_delete" {
  source = "../.."

  scope     = module.storage_account.id
  role_name = local.role_names.merged_control_limited
  source_roles = [
    azurerm_role_definition.source_container_rw_without_delete.name,
  ]

  description = "Merged control-plane role used by the limited probe identity for blob container create/read without delete."

  depends_on = [
    azurerm_role_definition.source_container_rw_without_delete,
  ]
}

module "container_rw_with_delete_restored" {
  source = "../.."

  scope     = module.storage_account.id
  role_name = local.role_names.merged_control_full
  source_roles = [
    azurerm_role_definition.source_container_rw_without_delete.name,
    azurerm_role_definition.source_container_delete_only.name,
  ]

  description = "Merged control-plane role used by the full probe identity where container delete is restored by a second permission block."

  depends_on = [
    azurerm_role_definition.source_container_rw_without_delete,
    azurerm_role_definition.source_container_delete_only,
  ]
}
