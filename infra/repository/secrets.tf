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

resource "github_actions_secret" "e2e_gh_runner_pat" {
  repository      = module.github_repository.name
  secret_name     = "E2E_GITHUB_RUNNER_PAT"
  plaintext_value = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}

resource "github_actions_secret" "e2e_gh_runner_app_id" {
  repository      = module.github_repository.name
  secret_name     = "E2E_GITHUB_APP_ID"
  plaintext_value = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}

resource "github_actions_secret" "e2e_gh_runner_app_installation_id" {
  repository      = module.github_repository.name
  secret_name     = "E2E_GITHUB_APP_INSTALLATION_ID"
  plaintext_value = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}

resource "github_actions_secret" "e2e_gh_runner_app_private_key" {
  repository      = module.github_repository.name
  secret_name     = "E2E_GITHUB_APP_PRIVATE_KEY"
  plaintext_value = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}

locals {
  stategraph_environments = toset([
    for pair in setproduct(["dev", "uat", "prod"], ["ci", "cd"]) :
    "infra-${pair[0]}-${pair[1]}"
  ])
}

resource "github_actions_environment_secret" "stategraph_username" {
  for_each = local.stategraph_environments

  repository      = module.github_repository.name
  environment     = each.value
  secret_name     = "STATEGRAPH_USERNAME"
  plaintext_value = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}

resource "github_actions_environment_secret" "stategraph_token" {
  for_each = local.stategraph_environments

  repository      = module.github_repository.name
  environment     = each.value
  secret_name     = "STATEGRAPH_TOKEN"
  plaintext_value = "placeholder"

  lifecycle {
    ignore_changes = [remote_updated_at]
  }
}
