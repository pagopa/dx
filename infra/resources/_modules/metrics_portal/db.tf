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
