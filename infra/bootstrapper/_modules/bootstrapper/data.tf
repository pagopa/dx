data "azurerm_subscription" "current" {}

data "azurerm_client_config" "current" {}

data "azuread_group" "admins" {
  display_name = local.adgroups.admins_name
}

data "azuread_group" "developers" {
  display_name = local.adgroups.devs_name
}

data "azuread_group" "externals" {
  display_name = local.adgroups.external_name
}

data "azurerm_resource_group" "tfstate" {
  name = "dx-d-itn-tfstate-rg-01"
}

data "azurerm_key_vault_secret" "codecov_token" {
  name         = "codecov-token"
  key_vault_id = module.core_values.common_key_vault.id
}

data "azurerm_key_vault_secret" "appinsights_instrumentation_key" {
  name         = module.core_values.application_insights.instrumentation_key_kv_secret_name
  key_vault_id = module.core_values.common_key_vault.id
}
