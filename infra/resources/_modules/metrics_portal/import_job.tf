# Container App Job that runs the DX metrics import task on a schedule.
# Connects to the same PostgreSQL database as the metrics portal and fetches
# data from GitHub using App credentials stored in Key Vault.

# After initial deployment, replace the placeholder values in Azure Key Vault
# with the actual credentials from the GitHub App configuration page.

# trivy:ignore:AVD-AZU-0015 Content type is optional for secrets
# trivy:ignore:AVD-AZU-0017 Expiration date is optional for long-lived secrets
resource "azurerm_key_vault_secret" "github_app_id" {
  name         = "dx-metrics-github-app-id"
  key_vault_id = var.key_vault_id

  # Public application identifier — stored in Key Vault to avoid hard-coding in container config.
  value_wo         = "placeholder"
  value_wo_version = 1
}

# trivy:ignore:AVD-AZU-0015 Content type is optional for secrets
# trivy:ignore:AVD-AZU-0017 Expiration date is optional for long-lived secrets
resource "azurerm_key_vault_secret" "github_app_installation_id" {
  name         = "dx-metrics-github-app-installation-id"
  key_vault_id = var.key_vault_id

  # Identifies which GitHub organization installation the App authenticates against.
  value_wo         = "placeholder"
  value_wo_version = 1
}

# trivy:ignore:AVD-AZU-0015 Content type is optional for secrets
# trivy:ignore:AVD-AZU-0017 Expiration date is optional for long-lived secrets
resource "azurerm_key_vault_secret" "github_app_private_key" {
  name         = "dx-metrics-github-app-private-key"
  key_vault_id = var.key_vault_id

  # PEM-encoded private key used to sign JWTs for GitHub App authentication.
  value_wo         = "placeholder"
  value_wo_version = 1
}

# Scheduled Container App Job for the data import task.
resource "azurerm_container_app_job" "import" {
  name                         = provider::dx::resource_name(merge(var.environment, { resource_type = "container_app_job" }))
  location                     = var.environment.location
  resource_group_name          = var.resource_group_name
  container_app_environment_id = var.container_app_env_id

  # Allow up to 4 hours for a full import run across all repositories and entity types.
  replica_timeout_in_seconds = 14400

  replica_retry_limit = 1

  workload_profile_name = "Consumption"

  # Reuse the Container App Environment managed identity for Key Vault access.
  # The portal's IAM role assignment already grants this identity "Secrets Reader".
  identity {
    type = "UserAssigned"
    identity_ids = [
      var.container_app_user_assigned_identity_id
    ]
  }

  schedule_trigger_config {
    cron_expression = "0 3 * * *"

    parallelism              = 1
    replica_completion_count = 1
  }

  # Key Vault references — the job reads secrets at runtime via the user-assigned identity.
  secret {
    name                = "database-url"
    key_vault_secret_id = azurerm_key_vault_secret.database_url.versionless_id
    identity            = var.container_app_user_assigned_identity_id
  }

  secret {
    name                = "github-app-id"
    key_vault_secret_id = azurerm_key_vault_secret.github_app_id.versionless_id
    identity            = var.container_app_user_assigned_identity_id
  }

  secret {
    name                = "github-app-installation-id"
    key_vault_secret_id = azurerm_key_vault_secret.github_app_installation_id.versionless_id
    identity            = var.container_app_user_assigned_identity_id
  }

  secret {
    name                = "github-app-private-key"
    key_vault_secret_id = azurerm_key_vault_secret.github_app_private_key.versionless_id
    identity            = var.container_app_user_assigned_identity_id
  }

  template {
    container {
      name   = "metrics-import"
      image  = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }

      env {
        name        = "GITHUB_APP_ID"
        secret_name = "github-app-id"
      }

      env {
        name        = "GITHUB_APP_INSTALLATION_ID"
        secret_name = "github-app-installation-id"
      }

      env {
        name        = "GITHUB_APP_PRIVATE_KEY"
        secret_name = "github-app-private-key"
      }

      env {
        name  = "IMPORT_SINCE_DAYS"
        value = "30"
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
    }
  }

  lifecycle {
    ignore_changes = [
      # The image is updated by CD pipelines, not Terraform.
      template[0].container[0].image
    ]
  }

  tags = var.tags

  depends_on = [module.container_app_key_vault_roles]
}
