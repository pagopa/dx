# Define the A Records for APIM

resource "azurerm_private_dns_a_record" "apim_azure_api_net" {
  name                = azurerm_api_management.this.name
  zone_name           = data.azurerm_private_dns_zone.azure_api_net.name
  resource_group_name = local.private_dns_zone_resource_group_name
  ttl                 = 3600
  records             = azurerm_api_management.this.private_ip_addresses

  tags = var.tags
}

resource "azurerm_private_dns_a_record" "apim_management_azure_api_net" {
  name                = azurerm_api_management.this.name
  zone_name           = data.azurerm_private_dns_zone.management_azure_api_net.name
  resource_group_name = local.private_dns_zone_resource_group_name
  ttl                 = 3600
  records             = azurerm_api_management.this.private_ip_addresses

  tags = var.tags
}

resource "azurerm_private_dns_a_record" "apim_scm_azure_api_net" {
  name                = azurerm_api_management.this.name
  zone_name           = data.azurerm_private_dns_zone.scm_azure_api_net.name
  resource_group_name = local.private_dns_zone_resource_group_name
  ttl                 = 3600
  records             = azurerm_api_management.this.private_ip_addresses

  tags = var.tags
}

# Define security group
resource "azurerm_network_security_group" "nsg_apim" {
  name                = replace(provider::dx::resource_name(merge(local.naming_config, { resource_type = "apim_network_security_group" })), "-apim-apim-", "-apim-")
  resource_group_name = data.azurerm_virtual_network.this.resource_group_name
  location            = var.environment.location

  security_rule {
    name                       = "managementapim"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "3443"
    source_address_prefix      = "ApiManagement"
    destination_address_prefix = "VirtualNetwork"
  }

  tags = var.tags
}

resource "azurerm_subnet_network_security_group_association" "snet_nsg" {
  subnet_id                 = var.subnet_id
  network_security_group_id = azurerm_network_security_group.nsg_apim.id
}