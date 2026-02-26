resource "github_actions_secret" "slack_webhook_url" {
  repository      = module.github_repository.name
  secret_name     = "SLACK_WEBHOOK_URL"
  plaintext_value = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}

resource "github_actions_secret" "le_private_key_json" {
  repository      = module.github_repository.name
  secret_name     = "LE_PRIVATE_KEY_JSON"
  plaintext_value = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}

resource "github_actions_secret" "le_regr_json" {
  repository      = module.github_repository.name
  secret_name     = "LE_REGR_JSON"
  plaintext_value = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}
