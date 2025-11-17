resource "github_actions_environment_secret" "integration_tests_client_id" {
  repository      = var.repository.name
  environment     = "integration-tests"
  secret_name     = "ARM_CLIENT_ID"
  plaintext_value = module.bootstrap.identities.infra.cd.client_id
}

resource "github_actions_environment_secret" "integration_tests_subscription_id" {
  repository      = var.repository.name
  environment     = "integration-tests"
  secret_name     = "ARM_SUBSCRIPTION_ID"
  plaintext_value = module.bootstrap.subscription_id
}

resource "azurerm_federated_identity_credential" "infra_cd_integration_tests" {
  resource_group_name = module.bootstrap.resource_group.name
  name                = "dx-environment-infra-dev-integration-tests"
  audience            = ["api://AzureADTokenExchange"]
  issuer              = "https://token.actions.githubusercontent.com"
  parent_id           = module.bootstrap.identities.infra.cd.id
  subject             = "repo:pagopa/${var.repository.name}:environment:${github_actions_environment_secret.integration_tests_client_id.environment}"
}
