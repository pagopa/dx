resource "azurerm_user_assigned_identity" "integration_tests" {
  count = var.environment.env_short == "u" ? 1 : 0

  resource_group_name = module.bootstrap.resource_group.name
  location            = module.bootstrap.resource_group.location
  name = provider::dx::resource_name(merge(var.environment, {
    app_name      = "integration"
    resource_type = "managed_identity",
  }))

  tags = var.tags
}

resource "azurerm_federated_identity_credential" "infra_cd_integration_tests" {
  count = var.environment.env_short == "u" ? 1 : 0

  name                      = "dx-environment-infra-uat-integration-tests"
  audience                  = ["api://AzureADTokenExchange"]
  issuer                    = "https://token.actions.githubusercontent.com"
  user_assigned_identity_id = azurerm_user_assigned_identity.integration_tests[0].id
  subject                   = "repo:${var.repository.owner}/${var.repository.name}:environment:${github_actions_environment_secret.integration_tests_client_id[0].environment}"
}

resource "azurerm_federated_identity_credential" "infra_cd_integration_tests_immutable" {
  count = var.environment.env_short == "u" ? 1 : 0

  name                      = "dx-environment-infra-uat-integration-tests-immutable"
  audience                  = ["api://AzureADTokenExchange"]
  issuer                    = "https://token.actions.githubusercontent.com"
  user_assigned_identity_id = azurerm_user_assigned_identity.integration_tests[0].id
  subject                   = "repo:${var.repository.owner}@${data.github_organization.owner[0].id}/${var.repository.name}@${data.github_repository.this[0].repo_id}:environment:${github_actions_environment_secret.integration_tests_client_id[0].environment}"
}
