resource "github_actions_environment_secret" "integration_tests_client_id" {
  repository      = var.repository.name
  environment     = "integration-tests"
  secret_name     = "ARM_CLIENT_ID"
  encrypted_value = base64sha256(module.bootstrap.identities.infra.cd.client_id)
}

resource "github_actions_environment_secret" "integration_tests_subscription_id" {
  repository      = var.repository.name
  environment     = "integration-tests"
  secret_name     = "ARM_SUBSCRIPTION_ID"
  encrypted_value = base64sha256(module.bootstrap.subscription_id)
}
