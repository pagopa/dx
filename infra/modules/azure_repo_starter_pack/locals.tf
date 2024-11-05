locals {
  resource_group = {
    name     = "${module.naming_convention.prefix}-rg-${module.naming_convention.suffix}"
    location = var.environment.location
  }

  ids = {
    infra_name = "${module.naming_convention.prefix}-infra-github-%s-id-${module.naming_convention.suffix}"
    app_name   = "${module.naming_convention.prefix}-app-github-%s-id-${module.naming_convention.suffix}"
    opex_name  = "${module.naming_convention.prefix}-opex-github-%s-id-${module.naming_convention.suffix}"

    infra_environment_name = "infra-${module.naming_convention.env_name}-%s"
    app_environment_name   = "app-${module.naming_convention.env_name}-%s"
    opex_environment_name  = "opex-${module.naming_convention.env_name}-%s"

    issuer   = "https://token.actions.githubusercontent.com"
    audience = ["api://AzureADTokenExchange"]

    federated_identity_name = "${var.repository.name}-environment-%s-${module.naming_convention.env_name}-%s"

    location = var.environment.location
  }

  tf_storage_account = {
    id = provider::azurerm::normalise_resource_id("${var.subscription_id}/resourceGroups/${var.terraform_storage_account.resource_group_name}/providers/Microsoft.Storage/storageAccounts/${var.terraform_storage_account.name}")
  }
}
