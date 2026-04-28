module "blob_rw_without_delete" {
  source = "../.."

  scope     = module.storage_account.id
  role_name = local.role_names.merged_limited
  source_roles = [
    azurerm_role_definition.source_blob_rw_without_delete.name,
    azurerm_role_definition.source_blob_read_only.name,
  ]

  reason = "Let the limited probe identity upload and read blobs while keeping delete excluded"

  depends_on = [
    azurerm_role_definition.source_blob_rw_without_delete,
    azurerm_role_definition.source_blob_read_only,
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

  reason = "Let the full probe identity regain blob delete through a second source role"

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
    azurerm_role_definition.source_container_read_only.name,
  ]

  reason = "Let the limited probe identity create and read blob containers while keeping delete excluded"

  depends_on = [
    azurerm_role_definition.source_container_rw_without_delete,
    azurerm_role_definition.source_container_read_only,
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

  reason = "Let the full probe identity regain blob container delete through a second source role"

  depends_on = [
    azurerm_role_definition.source_container_rw_without_delete,
    azurerm_role_definition.source_container_delete_only,
  ]
}
