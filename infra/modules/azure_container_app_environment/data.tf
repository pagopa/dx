data "azurerm_private_dns_zone" "this" {
  count = var.networking.public_network_access_enabled ? 0 : 1

  name                = "privatelink.${var.environment.location}.azurecontainerapps.io"
  resource_group_name = coalesce(var.networking.private_dns_zone_resource_group_name, local.vnet_resource_group_name)
}
