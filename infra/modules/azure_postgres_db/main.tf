terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.111.0"
    }
  }

  required_version = "~> 1.7.5"
}

provider "azurerm" {
  features {}

  storage_use_azuread = true
}

module "naming_convention" {
  source = "../azure_naming_convention"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    app_name        = var.environment.db_name
    instance_number = var.environment.instance_number
  }
}

#----------------------------#
# PostgreSQL Flexible Server #
#----------------------------#

resource "azurerm_postgresql_flexible_server" "this" {
  name                = local.db.name
  resource_group_name = data.azurerm_resource_group.this.name
  location            = var.environment.location
  version             = var.db_version

  # Network
  delegated_subnet_id           = var.private_endpoint_enabled ? local.delegated_subnet_id : null
  private_dns_zone_id           = var.private_endpoint_enabled ? local.private_dns_zone_id : null
  public_network_access_enabled = var.public_network_access_enabled

  # Credentials
  administrator_login    = local.db.credentials.name
  administrator_password = local.db.credentials.password

  # Backup
  backup_retention_days        = local.db.backup_retention_days
  geo_redundant_backup_enabled = local.db.geo_redundant_backup_enabled
  create_mode                  = local.db.create_mode
  zone                         = var.zone

  storage_mb = var.storage_mb
  sku_name   = local.db.sku_name

  dynamic "high_availability" {
    for_each = var.high_availability_enabled && var.standby_availability_zone != null ? ["dummy"] : []

    content {
      mode                      = "ZoneRedundant"
      standby_availability_zone = var.standby_availability_zone
    }
  }

  # Enable Customer managed key encryption

  dynamic "customer_managed_key" {
    for_each = local.db.customer_managed_key_enabled ? [1] : []
    content {
      key_vault_key_id                  = var.customer_managed_key_kv_key_id
      primary_user_assigned_identity_id = var.primary_user_assigned_identity_id
    }
  }

  dynamic "identity" {
    for_each = local.db.customer_managed_key_enabled ? [1] : []
    content {
      type         = "UserAssigned"
      identity_ids = [var.primary_user_assigned_identity_id]
    }

  }

  dynamic "maintenance_window" {
    for_each = var.maintenance_window_config != null ? ["dummy"] : []

    content {
      day_of_week  = var.maintenance_window_config.day_of_week
      start_hour   = var.maintenance_window_config.start_hour
      start_minute = var.maintenance_window_config.start_minute
    }
  }

  tags = var.tags
}

#-----------------------------#
# Configure: Enable PgBouncer #
#-----------------------------#

resource "azurerm_postgresql_flexible_server_configuration" "pgbouncer_enabled" {

  count = var.pgbouncer_enabled ? 1 : 0

  name      = "pgbouncer.enabled"
  server_id = azurerm_postgresql_flexible_server.this.id
  value     = "True"
}