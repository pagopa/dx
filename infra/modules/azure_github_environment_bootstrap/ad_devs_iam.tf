# Resource Group
resource "azurerm_role_assignment" "devs_group_rg" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "Contributor"
  principal_id         = var.entraid_groups.devs_object_id
  description          = "Allow ${var.repository.name} AD Dev group to apply changes at monorepository resource group scope"
}

# Key Vault
resource "azurerm_role_assignment" "devs_group_tf_rg_kv_secr" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = var.entraid_groups.devs_object_id
  description          = "Allow ${var.repository.name} AD Dev group to changes to KeyVault's secrets at monorepository resource group scope"
}