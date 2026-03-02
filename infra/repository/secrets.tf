resource "github_actions_secret" "slack_webhook_url" {
  repository      = module.github_repository.name
  secret_name     = "SLACK_WEBHOOK_URL"
  plaintext_value = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}

resource "github_actions_secret" "lets_encrypt_private_key" {
  repository      = module.github_repository.name
  secret_name     = "LETS_ENCRYPT_PRIVATE_KEY_JSON"
  plaintext_value = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}

resource "github_actions_secret" "lets_encrypt_registration" {
  repository      = module.github_repository.name
  secret_name     = "LETS_ENCRYPT_REGISTRATION_JSON"
  plaintext_value = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}
