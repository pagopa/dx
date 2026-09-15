resource "azurerm_postgresql_flexible_server_configuration" "connection_throttling" {
  name      = "connection_throttling"
  server_id = azurerm_postgresql_flexible_server.this.id
  value     = "on"
}

resource "azurerm_postgresql_flexible_server_configuration" "log_checkpoints" {
  name      = "log_checkpoints"
  server_id = azurerm_postgresql_flexible_server.this.id
  value     = "on"
}

resource "azurerm_postgresql_flexible_server_configuration" "connection_throttling_replica" {
  count = local.replica.create ? 1 : 0

  name      = "connection_throttling"
  server_id = azurerm_postgresql_flexible_server.replica[0].id
  value     = "on"
}

resource "azurerm_postgresql_flexible_server_configuration" "log_checkpoints_replica" {
  count = local.replica.create ? 1 : 0

  name      = "log_checkpoints"
  server_id = azurerm_postgresql_flexible_server.replica[0].id
  value     = "on"
}
