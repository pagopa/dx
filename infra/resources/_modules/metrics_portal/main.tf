locals {
  # Map from local naming convention ("environment") to DX registry module convention ("env_short")
  dx_environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.environment
    location        = var.environment.location
    domain          = var.environment.domain
    app_name        = var.environment.app_name
    instance_number = var.environment.instance_number
  }
}

# Generate a strong, random password for the PostgreSQL administrator account.
resource "random_password" "db_admin" {
  length           = 32
  special          = true
  override_special = "!*?"
}

# Store the raw admin password in Key Vault so it can be retrieved if needed.
resource "azurerm_key_vault_secret" "db_admin_password" {
  name         = "postgres-admin-password"
  value        = random_password.db_admin.result
  key_vault_id = var.key_vault_id
}

# Store the full connection string in Key Vault.
# The App Service reads it via a Key Vault reference in app_settings.
resource "azurerm_key_vault_secret" "db_connection_string" {
  name         = "postgres-connection-string"
  value        = "postgresql://dbadmin:${random_password.db_admin.result}@${module.postgres.postgres.name}.postgres.database.azure.com:5432/postgres?sslmode=require"
  key_vault_id = var.key_vault_id

  depends_on = [module.postgres]
}

# Publicly accessible App Service hosting the Next.js application.
module "app_service" {
  source  = "pagopa-dx/azure-app-service-exposed/azurerm"
  version = "~> 3.0"

  environment         = local.dx_environment
  resource_group_name = var.resource_group_name
  tags                = var.tags

  stack             = "node"
  node_version      = 22
  health_check_path = "/api/health"
  use_case          = "default"

  application_insights_connection_string = var.application_insights_connection_string

  app_settings = {
    DATABASE_URL = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.db_connection_string.versionless_id})"
    NODE_ENV     = "production"
    PORT         = "3000"
  }

  sticky_app_setting_names = ["NODE_ENV"]
}

# PostgreSQL Flexible Server accessed via private endpoint.
module "postgres" {
  source  = "pagopa-dx/azure-postgres-server/azurerm"
  version = "~> 2.0"

  environment         = local.dx_environment
  resource_group_name = var.resource_group_name
  tags                = var.tags

  subnet_pep_id                        = var.subnet_pep_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name

  administrator_credentials = {
    name     = "dbadmin"
    password = random_password.db_admin.result
  }

  # Disable replica in non-production environments to reduce cost.
  create_replica = false
}
