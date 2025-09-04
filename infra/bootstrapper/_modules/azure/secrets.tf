resource "github_actions_secret" "codecov_token" {
  count           = var.environment.env_short == "p" ? 1 : 0
  repository      = var.repository.name
  secret_name     = "CODECOV_TOKEN"
  plaintext_value = data.azurerm_key_vault_secret.codecov_token[0].value
}
