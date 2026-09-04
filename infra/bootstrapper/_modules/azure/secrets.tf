resource "github_actions_secret" "codecov_token" {
  count       = var.environment.env_short == "p" ? 1 : 0
  repository  = var.repository.name
  secret_name = "CODECOV_TOKEN"
  value       = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}

resource "github_actions_environment_secret" "appi_instrumentation_key" {
  repository  = var.repository.name
  environment = "app-${local.env_long}-cd"
  secret_name = "APPLICATIONINSIGHTS_INSTRUMENTATION_KEY"
  value       = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}
