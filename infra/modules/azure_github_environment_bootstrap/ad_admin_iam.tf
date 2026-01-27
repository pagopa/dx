# subscription roles defined in `eng-azure-authorization` repo

# Owner role at subscription level with ABAC condition for managed resource groups
resource "azurerm_role_assignment" "admins_group_subscription_owner" {
  scope                = var.subscription_id
  role_definition_name = "Owner"
  principal_id         = var.entraid_groups.admins_object_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} AD Admin group the complete ownership at managed resource group scopes"
}

# Key Vault Data Access Administrator role at subscription level with ABAC condition
resource "azurerm_role_assignment" "admins_group_subscription_kv_data" {
  scope                = var.subscription_id
  role_definition_name = "Key Vault Data Access Administrator"
  principal_id         = var.entraid_groups.admins_object_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} AD Admin group to apply changes to KeyVault's data at managed resource group scopes"
}

# Key Vault Administrator role at subscription level with ABAC condition
resource "azurerm_role_assignment" "admins_group_subscription_kv_admin" {
  scope                = var.subscription_id
  role_definition_name = "Key Vault Administrator"
  principal_id         = var.entraid_groups.admins_object_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} AD Admin group to apply changes to KeyVault at managed resource group scopes"
}
