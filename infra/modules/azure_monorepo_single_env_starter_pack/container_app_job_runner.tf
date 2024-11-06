
resource "azurerm_container_app_job" "github_runner" {
  container_app_environment_id = var.github_private_runner.container_app_environment_id
  name                         = local.container_apps.job_name
  location                     = var.github_private_runner.container_app_environment_location
  resource_group_name          = azurerm_resource_group.main.name

  identity {
    type = "SystemAssigned"
  }

  replica_timeout_in_seconds = 1800
  replica_retry_limit        = 1

  event_trigger_config {
    parallelism              = 1
    replica_completion_count = 1

    scale {
      max_executions              = var.github_private_runner.max_instances
      min_executions              = var.github_private_runner.min_instances
      polling_interval_in_seconds = var.github_private_runner.polling_interval_in_seconds

      rules {
        name             = "github-runner-rule"
        custom_rule_type = "github-runner"
        metadata = merge({
          owner                     = var.repository.owner
          runnerScope               = "repo"
          repos                     = "${var.repository.name}"
          targetWorkflowQueueLength = "1"
          github-runner             = "https://api.github.com"
        }, length(var.github_private_runner.labels) > 0 ? { labels = join(",", var.github_private_runner.labels) } : {})

        authentication {
          secret_name       = local.container_apps.secret_name
          trigger_parameter = "personalAccessToken"
        }
      }
    }
  }

  secret {
    key_vault_secret_id = "${data.azurerm_key_vault.runner.vault_uri}secrets/${var.github_private_runner.key_vault.secret_name}" # no versioning

    identity = "System"
    name     = local.container_apps.secret_name
  }

  template {
    container {
      cpu    = var.github_private_runner.cpu
      image  = "ghcr.io/pagopa/github-self-hosted-runner-azure:latest"
      memory = var.github_private_runner.memory
      name   = "github-runner"

      dynamic "env" {
        for_each = var.github_private_runner.labels
        content {
          name  = "LABELS"
          value = join(",", var.github_private_runner.labels)
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
        secret_name = local.container_apps.secret_name
      }
    }
  }

  tags = var.tags
}

resource "azurerm_key_vault_access_policy" "keyvault_containerapp" {
  key_vault_id = data.azurerm_key_vault.runner.id
  tenant_id    = azurerm_container_app_job.github_runner.identity[0].tenant_id
  object_id    = azurerm_container_app_job.github_runner.identity[0].principal_id

  secret_permissions = [
    "Get",
  ]
}
