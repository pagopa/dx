locals {
  naming_config = {
    prefix          = var.environment.prefix
    environment     = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    name            = var.environment.app_name
    instance_number = tonumber(var.environment.instance_number)
  }

  # Standard tags per DX required-tags guidance
  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = var.environment.env_short == "p" ? "Prod" : (var.environment.env_short == "d" ? "Dev" : "Uat")
    BusinessUnit   = "App IO"
    Source         = "https://github.com/pagopa/<repository>/blob/main/infra/resources/${var.environment.env_short}"
    ManagementTeam = "IO Platform"
  }

  # Example resource names using the DX provider helper (see DX docs)
  rg_name           = provider::dx::resource_name(merge(local.naming_config, { resource_type = "resource_group" }))
  storage_name      = provider::dx::resource_name(merge(local.naming_config, { resource_type = "storage_account" }))
  cosmos_name       = provider::dx::resource_name(merge(local.naming_config, { resource_type = "cosmosdb_account" }))
  function_app_name = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_app" }))
}
