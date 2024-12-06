data "github_organization_teams" "all" {
  root_teams_only = true
  summary_only    = true
}

data "azurerm_key_vault" "runner" {
  name                = var.github_private_runner.key_vault.name
  resource_group_name = var.github_private_runner.key_vault.resource_group_name
}
