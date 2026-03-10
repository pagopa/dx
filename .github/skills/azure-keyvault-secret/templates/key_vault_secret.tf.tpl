# Replace <RESOURCE_LABEL> with a descriptive Terraform identifier (snake_case).
# Replace placeholder values in angle brackets with the actual values for the project.
resource "azurerm_key_vault_secret" "<RESOURCE_LABEL>" {
  name         = "<SECRET_NAME>"          # Azure Key Vault secret name (kebab-case recommended)
  key_vault_id = <KEY_VAULT_ID_REFERENCE> # e.g. azurerm_key_vault.main.id or var.key_vault_id

  # Write-only: the value is sent to Azure but never persisted in Terraform state.
  # Set the real secret value through a secure channel (CI/CD, Azure CLI, portal)
  # after the first apply. Increment value_wo_version to trigger future updates.
  value_wo         = ""
  value_wo_version = 1

  # Optional — remove if not needed
  content_type = "<CONTENT_TYPE>" # e.g. "text/plain", "application/json"
  tags         = <TAGS_REFERENCE> # e.g. var.tags
}
