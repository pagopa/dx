data "azurerm_client_config" "current" {}

data "azurerm_subscription" "current" {}

data "azurerm_private_dns_zone" "kv" {
  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = data.azurerm_resource_group.network.name
}

data "azurerm_log_analytics_workspace" "e2e" {
  name                = local.e2e_log_analytics_workspace.name
  resource_group_name = local.e2e_virtual_network.resource_group_name
}

data "azurerm_user_assigned_identity" "integration_github" {
  name                = "dx-d-itn-devex-integration-id-01"
  resource_group_name = "dx-d-itn-devex-rg-01"
}

data "azurerm_virtual_network" "e2e" {
  name                = local.e2e_virtual_network.name
  resource_group_name = local.e2e_virtual_network.resource_group_name
}

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = data.azurerm_virtual_network.e2e.name
  resource_group_name  = data.azurerm_virtual_network.e2e.resource_group_name
}

data "azurerm_resource_group" "network" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "network"
    resource_type = "resource_group"
  }))
}
