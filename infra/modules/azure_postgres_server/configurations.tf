locals {
  postgres_security_configurations = {
    connection_throttling = "on"
    log_checkpoints       = "on"
  }
}

resource "azurerm_postgresql_flexible_server_configuration" "security" {
  for_each = local.postgres_security_configurations

  name      = each.key
  server_id = azurerm_postgresql_flexible_server.this.id
  value     = each.value
}

resource "azurerm_postgresql_flexible_server_configuration" "security_replica" {
  for_each = local.replica.create ? local.postgres_security_configurations : {}

  name      = each.key
  server_id = azurerm_postgresql_flexible_server.replica[0].id
  value     = each.value
}
