# Retrieve existing GitHub runner PAT from Key Vault
data "azurerm_key_vault_secret" "github_runner_pat" {
  name         = "github-runner-pat"
  key_vault_id = var.key_vault_id
}
