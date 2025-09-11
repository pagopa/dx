resource "github_actions_secret" "codecov_token" {
  count           = var.environment.env_short == "p" ? 1 : 0
  repository      = var.repository.name
  secret_name     = "CODECOV_TOKEN"
  plaintext_value = data.azurerm_key_vault_secret.codecov_token[0].value
}

resource "github_actions_environment_secret" "appi_instrumentation_key_ci" {
  repository      = var.repository.name
  environment     = "app-${local.env_long}-ci"
  secret_name     = "APPLICATIONINSIGHTS_INSTRUMENTATION_KEY"
  plaintext_value = data.azurerm_key_vault_secret.appi_instrumentation_key.value
}


resource "github_actions_environment_secret" "appi_instrumentation_key" {
  repository      = var.repository.name
  environment     = "app-${local.env_long}-cd"
  secret_name     = "APPLICATIONINSIGHTS_INSTRUMENTATION_KEY"
  plaintext_value = data.azurerm_key_vault_secret.appi_instrumentation_key.value
}
