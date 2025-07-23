resource "azurerm_container_app_job" "github_runner" {
  container_app_environment_id = var.container_app_environment.id
  name                         = local.container_apps.job_name
  location                     = var.container_app_environment.location
  resource_group_name          = local.container_apps.resource_group_name

  identity {
    type = "SystemAssigned"
  }

  replica_timeout_in_seconds = var.container_app_environment.replica_timeout_in_seconds
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

        # https://keda.sh/docs/2.16/scalers/github-runner/
        metadata = merge({
          owner                     = var.repository.owner
          runnerScope               = "repo"
          repos                     = var.repository.name
          targetWorkflowQueueLength = "1"
          github-runner             = "https://api.github.com"
        }, var.container_app_environment.use_labels ? { labels = local.labels } : {})

        authentication {
          secret_name       = var.key_vault.secret_name
          trigger_parameter = "personalAccessToken"
        }
      }
    }
  }

  secret {
    key_vault_secret_id = "${local.key_vault_uri}secrets/${var.key_vault.secret_name}" # no versioning

    identity = "System"
    name     = var.key_vault.secret_name
  }

  template {
    container {
      cpu    = var.container_app_environment.cpu
      image  = var.container_app_environment.image
      memory = var.container_app_environment.memory
      name   = "github-runner"

      dynamic "env" {
        for_each = var.container_app_environment.use_labels ? [1] : []
        content {
          name  = "LABELS"
          value = local.labels
        }
      }

      dynamic "env" {
        for_each = local.runner_env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = local.runner_secrets
        content {
          name        = env.key
          secret_name = env.value
        }
      }
    }
  }

  tags = local.tags
}
