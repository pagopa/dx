resource "azurerm_container_app_job" "github_runner" {
  container_app_environment_id = var.container_app_environment.id
  name                         = local.container_apps.job_name
  location                     = var.container_app_environment.location
  resource_group_name          = local.container_apps.resource_group_name

  identity {
    type = "SystemAssigned"
  }

  replica_timeout_in_seconds = 1800
  replica_retry_limit        = 1

  event_trigger_config {
    parallelism              = 1
    replica_completion_count = 1

    scale {
      max_executions              = var.container_app_environment.max_instances
      min_executions              = var.container_app_environment.min_instances
      polling_interval_in_seconds = var.container_app_environment.polling_interval_in_seconds

      rules {
        name             = "github-runner-rule"
        custom_rule_type = "github-runner"
        metadata = merge({
          owner                     = var.repository.owner
          runnerScope               = "repo"
          repos                     = var.repository.name
          targetWorkflowQueueLength = "1"
          github-runner             = "https://api.github.com"
        }, var.container_app_environment.use_labels ? { labels = [local.env[var.environment.env_short]] } : {})

        authentication {
          secret_name       = var.key_vault.secret_name
          trigger_parameter = "personalAccessToken"
        }
      }
    }
  }

  secret {
    key_vault_secret_id = "${data.azurerm_key_vault.kv.vault_uri}secrets/${var.key_vault.secret_name}" # no versioning

    identity = "System"
    name     = var.key_vault.secret_name
  }

  template {
    container {
      cpu    = var.container_app_environment.cpu
      image  = "ghcr.io/pagopa/github-self-hosted-runner-azure:latest"
      memory = var.container_app_environment.memory
      name   = "github-runner"

      dynamic "env" {
        for_each = var.container_app_environment.use_labels ? [1] : []
        content {
          name  = "LABELS"
          value = [local.env[var.environment.env_short]]
        }
      }

      env {
        name  = "REPO_URL"
        value = "https://github.com/${var.repository.owner}/${var.repository.name}"
      }

      env {
        name  = "REGISTRATION_TOKEN_API_URL"
        value = "https://api.github.com/repos/${var.repository.owner}/${var.repository.name}/actions/runners/registration-token"
      }

      env {
        name        = "GITHUB_PAT"
        secret_name = var.key_vault.secret_name
      }
    }
  }

  tags = var.tags
}
