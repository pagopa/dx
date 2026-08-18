data "azurerm_key_vault_secret" "payments_database_password" {
  name         = "payments-database-password"
  key_vault_id = module.azure_core_values.common_key_vault.id
}

module "payments_function" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 6.0"

  environment         = local.payments_environment
  resource_group_name = module.azure_core_values.common_resource_group_name
  use_case            = "default"

  subnet_id     = module.azure_core_values.common_test_snet.id
  subnet_pep_id = module.azure_core_values.common_pep_snet.id
  virtual_network = {
    name                = module.azure_core_values.common_vnet.name
    resource_group_name = module.azure_core_values.network_resource_group_name
  }
  private_dns_zone_resource_group_name = module.azure_core_values.network_resource_group_name

  health_check_path = "/api/health"
  app_settings = {
    PAYMENTS_MODE = "processor"
  }

  tags = local.tags
}
