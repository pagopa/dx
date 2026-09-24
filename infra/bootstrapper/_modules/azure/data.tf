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

data "github_organization" "owner" {
  count = var.environment.env_short == "u" ? 1 : 0

  name         = var.repository.owner
  summary_only = true
}

data "github_repository" "this" {
  count = var.environment.env_short == "u" ? 1 : 0

  name = var.repository.name
}
