locals {
  automation_cd_environment_name = "automation-${local.env[var.environment.env_short]}-cd"
  env = {
    d = "dev"
    u = "uat"
    p = "prod"
  }
}

resource "github_actions_environment_secret" "integration_tests_client_id" {
  count = var.environment.env_short == "d" ? 1 : 0

  repository      = var.repository.name
  environment     = local.automation_cd_environment_name
  secret_name     = "INTEGRATION_ARM_CLIENT_ID"
  plaintext_value = azurerm_user_assigned_identity.integration_tests[0].client_id
}

resource "github_actions_environment_secret" "integration_tests_subscription_id" {
  count = var.environment.env_short == "d" ? 1 : 0

  repository      = var.repository.name
  environment     = local.automation_cd_environment_name
  secret_name     = "INTEGRATION_ARM_SUBSCRIPTION_ID"
  plaintext_value = module.bootstrap.subscription_id
}

resource "github_actions_environment_secret" "automation_infra_cd_client_id" {
  repository      = var.repository.name
  environment     = local.automation_cd_environment_name
  secret_name     = "ARM_CLIENT_ID"
  plaintext_value = module.bootstrap.identities.infra.cd.client_id
}

resource "github_actions_environment_secret" "automation_infra_cd_subscription_id" {
  repository      = var.repository.name
  environment     = local.automation_cd_environment_name
  secret_name     = "ARM_SUBSCRIPTION_ID"
  plaintext_value = module.bootstrap.subscription_id
}
