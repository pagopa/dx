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
    app_name        = var.environment.app_name
    instance_number = var.environment.instance_number
  }
}

#-----------------------#
# MySQL Flexible Server #
#-----------------------#

resource "azurerm_mysql_flexible_server" "this" {
  name                = local.db.name
  resource_group_name = var.resource_group_name
  location            = var.environment.location

  # Network
  private_dns_zone_id = data.azurerm_private_dns_zone.mysql_dns_zone.id

  # Credentials
  administrator_login    = var.administrator_credentials.name
  administrator_password = var.administrator_credentials.password

  # Backup
  backup_retention_days        = var.backup_retention_days
  geo_redundant_backup_enabled = local.geo_redundant_backup_enabled
  create_mode                  = "Default"
  zone                         = var.zone

  dynamic "high_availability" {
    for_each = local.high_availability_enabled ? ["dummy"] : []

    content {
      mode = "ZoneRedundant"
    }
  }

  maintenance_window {
    day_of_week  = 3
    start_hour   = 2
    start_minute = 0
  }

  tags = var.tags
}