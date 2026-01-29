# subscription roles defined in `eng-azure-authorization` repo

module "merge_roles_admin_group" {
  source    = "./modules/merge-roles"
  role_name = "PagoPA DX Admin Group Role"

  source_roles = [
    "Owner",
    "Key Vault Data Access Administrator",
    "Key Vault Administrator"
  ]
}

# Wait for custom role to propagate in Azure before assigning
resource "time_sleep" "wait_for_admin_role" {
  depends_on = [module.merge_roles_admin_group]

  create_duration = "30s"
}

resource "azurerm_role_assignment" "admins_group_rgs_kv_admin" {
  for_each = local.resource_group_ids

  scope              = each.value
  role_definition_id = module.merge_roles_admin_group.custom_role_id
  principal_id       = var.entraid_groups.admins_object_id
  description        = "Allow ${var.repository.name} AD Admin group to changes to apply changes to KeyVault at ${each.value} resource group scope"

  depends_on = [time_sleep.wait_for_admin_role]
}
