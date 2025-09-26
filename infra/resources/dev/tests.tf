module "test_infrastructure" {
  source = "../_modules/test_infrastructure"

  environment = local.environment
  tests_kind  = local.tests_kind

  gh_pat_reference = {
    keyvault_name                = data.azurerm_key_vault.common.name
    keyvault_resource_group_name = data.azurerm_key_vault.common.resource_group_name
  }

  tags = local.tags
}
