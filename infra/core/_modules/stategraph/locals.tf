locals {
  environment_variables = {
    "DB_HOST"                        = azurerm_postgresql_flexible_server.stategraph.fqdn,
    "DB_PORT"                        = "5432"
    "DB_USER"                        = "stategraph",
    "DB_NAME"                        = "stategraph",
    "STATEGRAPH_UI_BASE"             = "https://stategraph.${var.dns.zone_name}",
    "STATEGRAPH_OAUTH_REDIRECT_BASE" = "https://stategraph.${var.dns.zone_name}",
    "POSTGRES_DB"                    = "stategraph",
    "STATEGRAPH_OAUTH_TYPE"          = "google",
    "STATEGRAPH_OAUTH_EMAIL_DOMAIN"  = "pagopa.it"
  }

  environment_secrets = [
    "DB_PASS",
    "STATEGRAPH_OAUTH_CLIENT_ID",
    "STATEGRAPH_OAUTH_CLIENT_SECRET"
  ]
}
