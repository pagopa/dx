resource "azurerm_user_assigned_identity" "integration_tests" {
  count = var.environment.env_short == "d" ? 1 : 0

  resource_group_name = module.bootstrap.resource_group.name
  location            = module.bootstrap.resource_group.location
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "integration"
    resource_type = "managed_identity",
  }))

  tags = var.tags
}

resource "azurerm_federated_identity_credential" "infra_cd_integration_tests" {
  count = var.environment.env_short == "d" ? 1 : 0

  name      = "dx-environment-infra-dev-integration-tests"
  audience  = ["api://AzureADTokenExchange"]
  issuer    = "https://token.actions.githubusercontent.com"
  parent_id = azurerm_user_assigned_identity.integration_tests[0].id
  subject   = "repo:pagopa/${var.repository.name}:environment:${github_actions_environment_secret.integration_tests_client_id[0].environment}"
}
