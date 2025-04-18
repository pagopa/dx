terraform {
  required_providers {
    dx = {
      source = "pagopa-dx/azure"
    }
  }
}

resource "azurerm_log_analytics_workspace" "this" {
  name = provider::dx::resource_name(merge(
    var.naming_config,
    {
      name          = "common",
      resource_type = "log_analytics",
  }))
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = var.tags
}