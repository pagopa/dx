resource "azurerm_container_app_job" "container_app_job" {
  container_app_environment_id = azurerm_container_app_environment.cae.id
  name                         = "${var.project}-${var.job.name}-ca-job"
  location                     = var.location
  resource_group_name          = var.resource_group_name

  identity {
    type = "SystemAssigned"
  }

  replica_timeout_in_seconds = 1800
  replica_retry_limit        = 1

  event_trigger_config {
    parallelism              = 1
    replica_completion_count = 1
    scale {
      max_executions              = 5
      min_executions              = 0
      polling_interval_in_seconds = 30
      rules {
        custom_rule_type = "github-runner"
        metadata = merge({
          owner                     = var.job.repo_owner
          runnerScope               = "repo"
          repos                     = var.job.repo
          targetWorkflowQueueLength = "1"
          github-runner             = "https://api.github.com"
        }, length(var.labels) > 0 ? { labels = join(",", var.labels) } : {})

        name = "${var.project}-${var.job.name}-github-runner-rule"

        authentication {
          secret_name       = "personal-access-token"
          trigger_parameter = "personalAccessToken"
        }
      }
    }
  }

  secret {
    key_vault_secret_id = data.azurerm_key_vault_secret.github_pat.id # no versioning

    identity = "System"
    name     = "personal-access-token"
  }

  template {
    container {
      cpu    = 0.5
      image  = "ghcr.io/pagopa/github-self-hosted-runner-azure:latest"
      memory = "1Gi"
      name   = "github-runner"

      dynamic "env" {
        for_each = var.labels
        content {
          name  = "LABELS"
          value = join(",", var.labels)
        }
      }

      env {
        name  = "REPO_URL"
        value = "https://github.com/${var.job.repo_owner}/${var.job.repo}"
      }

      env {
        name  = "REGISTRATION_TOKEN_API_URL"
        value = "https://api.github.com/repos/${var.job.repo_owner}/${var.job.repo}/actions/runners/registration-token"
      }

      env {
        name        = "GITHUB_PAT"
        secret_name = "personal-access-token"
      }
    }
  }

  # Prevent false plan changes on secret part
  lifecycle {
    ignore_changes = [secret]
  }

  tags = var.tags
}

resource "azurerm_key_vault_access_policy" "keyvault_containerapp" {
  key_vault_id = data.azurerm_key_vault.kv_common.id
  tenant_id    = azurerm_container_app_job.container_app_job.identity[0].tenant_id
  object_id    = azurerm_container_app_job.container_app_job.identity[0].principal_id

  secret_permissions = [
    "Get",
  ]
}