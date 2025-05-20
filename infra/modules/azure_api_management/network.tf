# Define the A Records for APIM

resource "azurerm_private_dns_a_record" "apim_azure_api_net" {
  name                = azurerm_api_management.this.name
  zone_name           = data.azurerm_private_dns_zone.azure_api_net.name
  resource_group_name = local.private_dns_zone_resource_group_name
  ttl                 = 3600
  records             = azurerm_api_management.this.private_ip_addresses

  tags = local.tags
}

resource "azurerm_private_dns_a_record" "apim_management_azure_api_net" {
  name                = azurerm_api_management.this.name
  zone_name           = data.azurerm_private_dns_zone.management_azure_api_net.name
  resource_group_name = local.private_dns_zone_resource_group_name
  ttl                 = 3600
  records             = azurerm_api_management.this.private_ip_addresses

  tags = local.tags
}

resource "azurerm_private_dns_a_record" "apim_scm_azure_api_net" {
  name                = azurerm_api_management.this.name
  zone_name           = data.azurerm_private_dns_zone.scm_azure_api_net.name
  resource_group_name = local.private_dns_zone_resource_group_name
  ttl                 = 3600
  records             = azurerm_api_management.this.private_ip_addresses

  tags = local.tags
}

# Define security group
resource "azurerm_network_security_group" "nsg_apim" {
  name                = replace(provider::dx::resource_name(merge(local.naming_config, { resource_type = "apim_network_security_group" })), "-apim-apim-", "-apim-")
  resource_group_name = data.azurerm_virtual_network.this.resource_group_name
  location            = var.environment.location

  security_rule {
    name                       = "apim-management"
    priority                   = 200
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "3443"
    source_address_prefix      = "ApiManagement"
    destination_address_prefix = "VirtualNetwork"
    description                = "Management endpoint for Azure portal and PowerShell"
  }

  security_rule {
    name                       = "azure-load-balancer"
    priority                   = 201
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "6390"
    source_address_prefix      = "AzureLoadBalancer"
    destination_address_prefix = "VirtualNetwork"
    description                = "Azure Infrastructure Load Balancer"
  }

  security_rule {
    name                       = "storage"
    priority                   = 200
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "Storage"
    description                = "Dependency on Azure Storage for core service functionality"
  }

  security_rule {
    name                       = "sql"
    priority                   = 201
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "1433"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "SQL"
    description                = "Access to Azure SQL endpoints for core service functionality"
  }

  security_rule {
    name                       = "azure-keyvault"
    priority                   = 202
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "AzureKeyVault"
    description                = "Access to Azure Key Vault for core service functionality"
  }

  security_rule {
    name                       = "azure-monitor"
    priority                   = 203
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_ranges    = ["1886", "443"]
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "AzureMonitor"
    description                = "Publish Diagnostics Logs and Metrics, Resource Health, and Application Insights"
  }

  tags = local.tags
}

resource "azurerm_subnet_network_security_group_association" "snet_nsg" {
  subnet_id                 = var.subnet_id
  network_security_group_id = azurerm_network_security_group.nsg_apim.id
}
