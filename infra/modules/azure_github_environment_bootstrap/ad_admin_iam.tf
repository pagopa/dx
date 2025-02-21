# subscription roles defined in `eng-azure-authorization` repo

# Resource Group
resource "azurerm_role_assignment" "admins_group_rg" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Owner"
  principal_id         = var.entraid_groups.admins_object_id
  description          = "Allow ${var.repository.name} AD Admin group the complete ownership at monorepository resource group scope"
}

resource "azurerm_role_assignment" "admins_group_secondary_rg" {
  for_each = var.secondary_resource_group_ids

  scope                = each.value
  role_definition_name = "Owner"
  principal_id         = var.entraid_groups.admins_object_id
  description          = "Allow ${var.repository.name} AD Admin group the complete ownership at ${each.value} resource group scope"
}

# Key Vault
resource "azurerm_role_assignment" "admins_group_rg_kv_data" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Key Vault Data Access Administrator"
  principal_id         = var.entraid_groups.admins_object_id
  description          = "Allow ${var.repository.name} AD Admin group to changes to apply changes to KeyVault's data at monorepository resource group scope"
}

resource "azurerm_role_assignment" "admins_group_secondary_rg_kv_data" {
  for_each = var.secondary_resource_group_ids

  scope                = each.value
  role_definition_name = "Key Vault Data Access Administrator"
  principal_id         = var.entraid_groups.admins_object_id
  description          = "Allow ${var.repository.name} AD Admin group to changes to apply changes to KeyVault's data at ${each.value} resource group scope"
}

resource "azurerm_role_assignment" "admins_group_rg_kv_admin" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = var.entraid_groups.admins_object_id
  description          = "Allow ${var.repository.name} AD Admin group to changes to apply changes to KeyVault at monorepository resource group scope"
}

resource "azurerm_role_assignment" "admins_group_secondary_rg_kv_admin" {
  for_each = var.secondary_resource_group_ids

  scope                = each.value
  role_definition_name = "Key Vault Administrator"
  principal_id         = var.entraid_groups.admins_object_id
  description          = "Allow ${var.repository.name} AD Admin group to changes to apply changes to KeyVault at ${each.value} resource group scope"
}
