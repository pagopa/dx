module "testing" {
  source = "../_modules/testing"

  environment = local.environment
  test_modes  = local.test_modes

  gh_pat_reference = {
    keyvault_name                = data.azurerm_key_vault.common.name
    keyvault_resource_group_name = data.azurerm_key_vault.common.resource_group_name
  }

  tags = local.tags
}
