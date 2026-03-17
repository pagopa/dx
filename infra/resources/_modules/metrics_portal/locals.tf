locals {
  dx_environment = merge(var.environment, {
    env_short = var.environment.environment
  })

  # Parse Key Vault resource ID using azurerm provider function
  kv_id_parts = provider::azurerm::parse_resource_id(var.key_vault_id)

  key_vault_subscription_id     = local.kv_id_parts.subscription_id
  key_vault_resource_group_name = local.kv_id_parts.resource_group_name
  key_vault_name                = local.kv_id_parts.resource_name
}
