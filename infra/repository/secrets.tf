resource "github_actions_secret" "slack_webhook_url_drift_detection" {
  repository      = module.github_repository.name
  secret_name     = "SLACK_WEBHOOK_URL"
  plaintext_value = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}

resource "github_actions_secret" "slack_webhook_url_failed_tests" {
  repository      = module.github_repository.name
  secret_name     = "SLACK_WEBHOOK_URL_FAILED_TESTS"
  plaintext_value = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}
