# Contributor role at subscription level with ABAC condition for managed resource groups
resource "azurerm_role_assignment" "devs_group_subscription" {
  scope                = var.subscription_id
  role_definition_name = "Contributor"
  principal_id         = var.entraid_groups.devs_object_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} AD Dev group to apply changes at managed resource group scopes"
}

# Key Vault Secrets Officer role at subscription level with ABAC condition for managed resource groups
resource "azurerm_role_assignment" "devs_group_subscription_kv_secr" {
  scope                = var.subscription_id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = var.entraid_groups.devs_object_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} AD Dev group to change KeyVault's secrets at managed resource group scopes"
}
