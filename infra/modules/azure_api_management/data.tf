#------------#
# Networking #
#------------#
data "azurerm_virtual_network" "this" {
  name                = var.virtual_network.name
  resource_group_name = var.virtual_network.resource_group_name
}

data "azurerm_private_dns_zone" "azure_api_net" {
  count = var.private_dns_zone_ids != null && var.private_dns_zone_ids.azure_api_net != null ? 0 : 1

  name                = "azure-api.net"
  resource_group_name = local.private_dns_zone_resource_group_name
}

data "azurerm_private_dns_zone" "management_azure_api_net" {
  count = var.private_dns_zone_ids != null && var.private_dns_zone_ids.management_azure_api_net != null ? 0 : 1

  name                = "management.azure-api.net"
  resource_group_name = local.private_dns_zone_resource_group_name
}

data "azurerm_private_dns_zone" "scm_azure_api_net" {
  count = var.private_dns_zone_ids != null && var.private_dns_zone_ids.scm_azure_api_net != null ? 0 : 1

  name                = "scm.azure-api.net"
  resource_group_name = local.private_dns_zone_resource_group_name
}

data "azurerm_private_dns_zone" "apim" {
  count = local.use_case_features.private_endpoint && var.private_dns_zone_ids == null ? 1 : 0

  name                = "privatelink.azure-api.net"
  resource_group_name = local.private_dns_zone_resource_group_name
}
