locals {
  environment_variables = {
    "DB_HOST"                        = "",
    "DB_PORT"                        = "5432"
    "DB_USER"                        = "stategraph",
    "DB_NAME"                        = "stategraph",
    "STATEGRAPH_UI_BASE"             = "", # TODO: add DNS
    "STATEGRAPH_OAUTH_REDIRECT_BASE" = "", # TODO: add DNS
    "POSTGRES_DB"                    = "stategraph",
  }

  environment_secrets = [
    "DB_PASS",    # TODO: create secret
    "LICENSE_KEY" # TODO: create secret
  ]
}
