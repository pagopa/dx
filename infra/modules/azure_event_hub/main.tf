terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.111.0, <= 3.116.0"
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

#---------------------------#
# Azure Event HUB Namespace #
#---------------------------#

resource "azurerm_eventhub_namespace" "this" {
  name                          = local.eventhub.name
  location                      = var.environment.location
  resource_group_name           = var.resource_group_name
  sku                           = local.eventhub.sku_name
  capacity                      = local.capacity
  auto_inflate_enabled          = local.auto_inflate_enabled
  maximum_throughput_units      = local.maximum_throughput_units
  public_network_access_enabled = false

  tags = var.tags
}

#-------------------------------#
# Azure Event HUB Configuration #
#-------------------------------#
resource "azurerm_eventhub" "events" {
  for_each = local.hubs

  name                = each.key
  namespace_name      = azurerm_eventhub_namespace.this.name
  resource_group_name = var.resource_group_name
  partition_count     = each.value.partitions
  message_retention   = each.value.message_retention_days
}

resource "azurerm_eventhub_consumer_group" "consumer_group" {
  for_each = local.consumers

  name                = each.value.name
  namespace_name      = azurerm_eventhub_namespace.this.name
  eventhub_name       = each.value.hub
  resource_group_name = var.resource_group_name
  user_metadata       = "terraform"

  depends_on = [azurerm_eventhub.events]
}

resource "azurerm_eventhub_authorization_rule" "authorization_rule" {
  for_each = local.keys

  name                = each.value.key.name
  namespace_name      = azurerm_eventhub_namespace.this.name
  eventhub_name       = each.value.hub
  resource_group_name = var.resource_group_name

  listen = each.value.key.listen
  send   = each.value.key.send
  manage = each.value.key.manage

  depends_on = [azurerm_eventhub.events]
}