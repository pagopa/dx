locals {
  naming_config = {
    prefix          = var.environment.prefix
    environment     = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    name            = var.environment.app_name
    instance_number = tonumber(var.environment.instance_number)
  }

  resource_group_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "resource_group" }
  ))

  function_app_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "function_app" }
  ))

  storage_account_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "storage_account" }
  ))

  cosmos_account_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "cosmosdb_account" }
  ))

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/experiments/results/website-crawl/run-1/output"
    ManagementTeam = "Developer Experience"
  }

  app_settings = merge(
    {
      for s in var.app_settings_secrets :
      s.name => "@Microsoft.KeyVault(VaultName=${var.key_vault_name};SecretName=${s.key_vault_secret_name})"
    },
    {
      "COSMOS_DB_ENDPOINT" = module.cosmos_db.endpoint
      "NODE_ENV"           = "production"
    }
  )
}
