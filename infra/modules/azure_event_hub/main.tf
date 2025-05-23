terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.111.0, < 5.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = ">= 0.0.6, < 1.0.0"
    }
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
  public_network_access_enabled = length(var.allowed_sources.subnet_ids) > 0 || length(var.allowed_sources.ips) > 0 ? true : false

  dynamic "network_rulesets" {
    for_each = length(var.allowed_sources.subnet_ids) > 0 || length(var.allowed_sources.ips) > 0 ? [1] : []
    content {
      default_action                 = "Deny"
      trusted_service_access_enabled = false

      dynamic "virtual_network_rule" {
        for_each = var.allowed_sources.subnet_ids
        content {
          subnet_id                                       = virtual_network_rule.value
          ignore_missing_virtual_network_service_endpoint = false
        }
      }
      dynamic "ip_rule" {
        for_each = var.allowed_sources.ips
        content {
          ip_mask = ip_rule.value
          action  = "Allow"
        }
      }
    }
  }

  tags = local.tags
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
