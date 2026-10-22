resource "github_actions_secret" "slack_webhook_url" {
  repository  = module.github_repository.name
  secret_name = "SLACK_WEBHOOK_URL"
  value       = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}

resource "github_actions_secret" "lets_encrypt_private_key" {
  repository  = module.github_repository.name
  secret_name = "LETS_ENCRYPT_PRIVATE_KEY_JSON"
  value       = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}

resource "github_actions_secret" "lets_encrypt_registration" {
  repository  = module.github_repository.name
  secret_name = "LETS_ENCRYPT_REGISTRATION_JSON"
  value       = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}

resource "github_actions_secret" "e2e_gh_runner_pat" {
  repository  = module.github_repository.name
  secret_name = "E2E_GITHUB_RUNNER_PAT"
  value       = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}

resource "github_actions_secret" "e2e_gh_runner_app_id" {
  repository  = module.github_repository.name
  secret_name = "E2E_GITHUB_APP_ID"
  value       = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}

resource "github_actions_secret" "e2e_gh_runner_app_installation_id" {
  repository  = module.github_repository.name
  secret_name = "E2E_GITHUB_APP_INSTALLATION_ID"
  value       = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}

resource "github_actions_secret" "e2e_gh_runner_app_private_key" {
  repository  = module.github_repository.name
  secret_name = "E2E_GITHUB_APP_PRIVATE_KEY"
  value       = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}

resource "github_actions_secret" "gh_app_release_app_key" {
  repository  = module.github_repository.name
  secret_name = "GH_APP_RELEASE_APP_KEY"
  value       = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}

resource "github_actions_secret" "gh_app_release_client_id" {
  repository  = module.github_repository.name
  secret_name = "GH_APP_RELEASE_CLIENT_ID"
  value       = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}

// Generated via dx bot user for e2e tests pat-based scenarios
resource "github_actions_environment_secret" "github_token" {
  repository  = module.github_repository.name
  environment = github_repository_environment.automation_uat_cd.environment
  secret_name = "GH_TOKEN"
  value       = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}
