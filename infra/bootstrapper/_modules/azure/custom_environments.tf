resource "github_actions_environment_secret" "integration_tests_client_id" {
  count = var.environment.env_short == "d" ? 1 : 0

  repository      = var.repository.name
  environment     = "integration-tests"
  secret_name     = "ARM_CLIENT_ID"
  plaintext_value = azurerm_user_assigned_identity.integration_tests[0].client_id
}

resource "github_actions_environment_secret" "integration_tests_subscription_id" {
  count = var.environment.env_short == "d" ? 1 : 0

  repository      = var.repository.name
  environment     = "integration-tests"
  secret_name     = "ARM_SUBSCRIPTION_ID"
  plaintext_value = module.bootstrap.subscription_id
}
