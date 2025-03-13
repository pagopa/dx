#------------#
# Networking #
#------------#
data "azurerm_virtual_network" "this" {
  name                = var.virtual_network.name
  resource_group_name = var.virtual_network.resource_group_name
}

data "azurerm_private_dns_zone" "azure_api_net" {
  name                = "azure-api.net"
  resource_group_name = local.private_dns_zone_resource_group_name
}

data "azurerm_private_dns_zone" "management_azure_api_net" {
  name                = "management.azure-api.net"
  resource_group_name = local.private_dns_zone_resource_group_name
}

data "azurerm_private_dns_zone" "scm_azure_api_net" {
  name                = "scm.azure-api.net"
  resource_group_name = local.private_dns_zone_resource_group_name
}

#-------------------#
#   API Management  #
#-------------------#
data "azurerm_monitor_diagnostic_categories" "apim" {
  resource_id = azurerm_api_management.this.id
}
