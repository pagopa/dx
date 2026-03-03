# trivy:ignore:AVD-AZU-0017
resource "azurerm_key_vault_secret" "stategraph_postgres_password" {
  name             = "db-pass"
  value_wo         = ephemeral.random_password.psql.result
  value_wo_version = 3
  key_vault_id     = var.key_vault.id
  content_type     = "stategraph/db-password"

  tags = var.tags
}
