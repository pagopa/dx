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

#-----------------#
# Azure Event HUB #
#-----------------#

module "event_hub" {
  source = "github.com/pagopa/terraform-azurerm-v3//eventhub?ref=v8.44.0"

  name                 = local.eventhub.name
  location             = var.environment.location
  resource_group_name  = var.resource_group_name
  auto_inflate_enabled = local.auto_inflate_enabled
  sku                  = local.eventhub.sku_name
  zone_redundant       = local.zone_redundant


  virtual_network_ids = []

  private_endpoint_created      = false
  public_network_access_enabled = false

  alerts_enabled = local.alerts_enabled

  tags = var.tags
}

module "event_hub_configuration" {
  count = length(var.eventhubs) > 0 ? 1 : 0

  source = "github.com/pagopa/terraform-azurerm-v3//eventhub_configuration?ref=v8.44.0"

  event_hub_namespace_name                = module.event_hub.name
  event_hub_namespace_resource_group_name = var.resource_group_name

  eventhubs = var.eventhubs
}