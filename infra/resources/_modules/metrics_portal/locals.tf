locals {
  # Parse Key Vault resource ID using azurerm provider function
  kv_id_parts = provider::azurerm::parse_resource_id(var.key_vault_id)

  key_vault_subscription_id     = local.kv_id_parts.subscription_id
  key_vault_resource_group_name = local.kv_id_parts.resource_group_name
  key_vault_name                = local.kv_id_parts.resource_name

  # Naming configuration for the import Container App Job.
  # Uses app_name "import" to distinguish it from the portal ("portal").
  import_job_naming_config = {
    prefix          = var.environment.prefix
    environment     = var.environment.environment
    location        = var.environment.location
    domain          = var.environment.domain
    name            = "import"
    instance_number = tonumber(var.environment.instance_number)
  }
}
