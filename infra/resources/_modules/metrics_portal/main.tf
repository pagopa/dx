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

  environment         = local.dx_environment
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

# Publicly accessible Container App hosting the Next.js application.
module "container_app" {
  source  = "pagopa-dx/azure-container-app/azurerm"
  version = "~> 1.0"

  environment         = merge(local.dx_environment, { env_short = local.dx_environment.env_short })
  resource_group_name = var.resource_group_name
  tags                = var.tags

  container_app_environment_id = var.container_app_env_id
  user_assigned_identity_id    = var.container_app_user_assigned_identity_id

  revision_mode = "Single"
  tier          = "s" # 0.5 CPU, 1Gi memory, 1-1 replicas
  target_port   = 3000

  container_app_templates = [
    {
      image = var.container_app_image
      name  = "metrics-portal"

      app_settings = {
        NODE_ENV                = "production"
        PORT                    = "3000"
        DATABASE_HOST           = module.postgres.postgres.fqdn
        DATABASE_PORT           = "5432"
        DATABASE_NAME           = "postgres"
        DATABASE_USER           = "dbadmin"
        DATABASE_PASSWORD_VAULT = module.postgres.admin_password_secret.versionless_id
      }

      liveness_probe = {
        path          = "/health"
        initial_delay = 30
        timeout       = 5
        transport     = "HTTP"
      }
    }
  ]

  depends_on = [module.postgres]
}
