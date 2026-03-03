locals {
  environment_variables = {
    "DB_HOST"            = azurerm_postgresql_flexible_server.stategraph.fqdn,
    "DB_PORT"            = "5432"
    "DB_USER"            = "stategraph",
    "DB_NAME"            = "stategraph",
    "STATEGRAPH_UI_BASE" = "stategraph.${var.dns.zone_name}",
    "POSTGRES_DB"        = "stategraph",
  }

  environment_secrets = [
    "DB_PASS",
  ]
}
