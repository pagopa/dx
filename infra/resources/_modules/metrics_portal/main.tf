# Retrieve existing GitHub runner PAT from Key Vault
data "azurerm_key_vault_secret" "github_runner_pat" {
  name         = "github-runner-pat"
  key_vault_id = var.key_vault_id
}

data "azurerm_client_config" "current" {}

# Generate a strong, random password for the PostgreSQL administrator account.
# Using ephemeral so the password is never persisted to Terraform state.
ephemeral "random_password" "db_admin" {
  length           = 32
  special          = true
  override_special = "!*?"
}

# PostgreSQL Flexible Server accessed via private endpoint.
# Uses write-only password attributes to keep credentials out of Terraform state.
# The module automatically creates the admin password secret in Key Vault.
module "postgres" {
  source  = "pagopa-dx/azure-postgres-server/azurerm"
  version = "~> 3.0"

  environment         = merge(var.environment, { env_short = var.environment.environment })
  resource_group_name = var.resource_group_name
  tags                = var.tags

  subnet_pep_id                        = var.subnet_pep_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name

  admin_username         = "dbadmin"
  admin_password         = ephemeral.random_password.db_admin.result
  admin_password_version = 1 # Increment this value when rotating the password

  # Let the module manage the Key Vault secret for the admin password.
  # Requires Key Vault Secrets Officer role on the vault for the Terraform identity.
  key_vault_id = var.key_vault_id

  # Disable replica in non-production environments to reduce cost.
  create_replica = false
}

# Store app secrets in Key Vault using write-only attributes.
# trivy:ignore:AVD-AZU-0015 Content type is optional for secrets
# trivy:ignore:AVD-AZU-0017 Expiration date is optional for long-lived secrets
resource "azurerm_key_vault_secret" "database_url" {
  name         = "dx-metrics-database-url"
  key_vault_id = var.key_vault_id

  value_wo         = "postgresql://dbadmin:${ephemeral.random_password.db_admin.result}@${module.postgres.postgres.name}.postgres.database.azure.com:5432/postgres?sslmode=verify-full"
  value_wo_version = 2
}

# trivy:ignore:AVD-AZU-0015 Content type is optional for secrets
# trivy:ignore:AVD-AZU-0017 Expiration date is optional for long-lived secrets
resource "azurerm_key_vault_secret" "auth_github_id" {
  name         = "dx-metrics-auth-github-id"
  key_vault_id = var.key_vault_id

  value_wo         = "placeholder"
  value_wo_version = 1
}

# trivy:ignore:AVD-AZU-0015 Content type is optional for secrets
# trivy:ignore:AVD-AZU-0017 Expiration date is optional for long-lived secrets
resource "azurerm_key_vault_secret" "auth_github_secret" {
  name         = "dx-metrics-auth-github-secret"
  key_vault_id = var.key_vault_id

  value_wo         = "placeholder"
  value_wo_version = 1
}

# trivy:ignore:AVD-AZU-0015 Content type is optional for secrets
# trivy:ignore:AVD-AZU-0017 Expiration date is optional for long-lived secrets
resource "azurerm_key_vault_secret" "auth_entra_id_client_id" {
  name         = "dx-metrics-auth-entra-id-client-id"
  key_vault_id = var.key_vault_id

  value_wo         = var.auth_entra_id_client_id != null ? var.auth_entra_id_client_id : "placeholder"
  value_wo_version = 1
}

# trivy:ignore:AVD-AZU-0015 Content type is optional for secrets
# trivy:ignore:AVD-AZU-0017 Expiration date is optional for long-lived secrets
resource "azurerm_key_vault_secret" "auth_entra_id_tenant_id" {
  name         = "dx-metrics-auth-entra-id-tenant-id"
  key_vault_id = var.key_vault_id

  value_wo         = data.azurerm_client_config.current.tenant_id
  value_wo_version = 1
}

# Publicly accessible Container App hosting the Next.js application.
module "container_app" {
  # source  = "pagopa-dx/azure-container-app/azurerm"
  # version = "~> 1.0"
  source = "github.com/pagopa/dx//infra/modules/azure_container_app?ref=allow-container-app-environment-to-have-public-connectivity"

  environment         = merge(var.environment, { env_short = var.environment.environment })
  resource_group_name = var.resource_group_name
  tags                = var.tags

  container_app_environment_id = var.container_app_env_id
  user_assigned_identity_id    = var.container_app_user_assigned_identity_id

  revision_mode = "Single"
  use_case      = "default"

  size = {
    cpu    = 0.5
    memory = "1Gi"
  }

  target_port = 3000

  external_enabled = true
  custom_domain = {
    host_name = var.custom_domain_host_name
    dns = {
      zone_name                = "dx.pagopa.it"
      zone_resource_group_name = var.network_resource_group_name
    }
  }

  auth = var.auth_entra_id_client_id != null ? {
    azure_active_directory = {
      client_id                  = var.auth_entra_id_client_id
      client_secret_setting_name = replace(lower(azurerm_key_vault_secret.better_auth_secret.name), "_", "-")
      tenant_id                  = data.azurerm_client_config.current.tenant_id
    }
  } : null

  secrets = [
    {
      name                = "DATABASE_URL"
      key_vault_secret_id = azurerm_key_vault_secret.database_url.versionless_id
    },
    {
      name                = "BETTER_AUTH_SECRET"
      key_vault_secret_id = azurerm_key_vault_secret.better_auth_secret.versionless_id
    },
    {
      name                = "GITHUB_TOKEN"
      key_vault_secret_id = data.azurerm_key_vault_secret.github_runner_pat.versionless_id
    }
  ]

  container_app_templates = [
    {
      image = var.container_app_image
      name  = "metrics-portal"

      app_settings = {
        NODE_ENV = "production"
        PORT     = "3000"
      }

      liveness_probe = {
        path          = "/health"
        initial_delay = 30
        timeout       = 5
        transport     = "HTTP"
      }
    }
  ]

  depends_on = [module.postgres, module.container_app_key_vault_roles]
}
