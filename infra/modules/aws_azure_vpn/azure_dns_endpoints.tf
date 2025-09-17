resource "dx_available_subnet_cidr" "outbound_endpoint_cidr" {
  provider           = azuredx
  virtual_network_id = var.azure.vnet_id
  prefix_length      = 28
}

resource "dx_available_subnet_cidr" "inbound_endpoint_cidr" {
  count              = var.use_case == "high_availability" ? 1 : 0
  provider           = azuredx
  virtual_network_id = var.azure.vnet_id
  prefix_length      = 28

  depends_on = [azurerm_subnet.outbound_endpoint_snet]
}

resource "azurerm_subnet" "inbound_endpoint_snet" {
  count = var.use_case == "high_availability" ? 1 : 0
  name = provider::azuredx::resource_name(merge(
    local.azure_naming_config,
    {
      name          = "inbound-endpoint",
      resource_type = "subnet",
  }))
  virtual_network_name = var.azure.vnet_name
  resource_group_name  = var.azure.resource_group_name
  address_prefixes     = [dx_available_subnet_cidr.inbound_endpoint_cidr[0].cidr_block]

  delegation {
    name = "dns-inbound-delegation"

    service_delegation {
      name = "Microsoft.Network/dnsResolvers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

resource "azurerm_subnet" "outbound_endpoint_snet" {
  name = provider::azuredx::resource_name(merge(
    local.azure_naming_config,
    {
      name          = "outbound-endpoint",
      resource_type = "subnet",
  }))
  resource_group_name  = var.azure.resource_group_name
  virtual_network_name = var.azure.vnet_name
  address_prefixes     = [dx_available_subnet_cidr.outbound_endpoint_cidr.cidr_block]

  delegation {
    name = "dns-outbound-delegation"

    service_delegation {
      name = "Microsoft.Network/dnsResolvers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

# Azure Private DNS Resolver
resource "azurerm_private_dns_resolver" "main" {
  # name                = provider::azuredx::resource_name(merge(local.azure_naming_config, { resource_type = "private_dns_resolver" }))
  name                = "private-dns-resolver"
  resource_group_name = var.azure.resource_group_name
  location            = var.azure.location
  virtual_network_id  = var.azure.vnet_id

  tags = var.tags
}

# Inbound Endpoint - allows AWS to query Azure private DNS zones
resource "azurerm_private_dns_resolver_inbound_endpoint" "main" {
  count = var.use_case == "high_availability" ? 1 : 0
  # name                    = provider::azuredx::resource_name(merge(local.azure_naming_config, { resource_type = "private_dns_resolver_inbound_endpoint" }))
  name                    = "private-dns-resolver-inbound-endpoint"
  private_dns_resolver_id = azurerm_private_dns_resolver.main.id
  location                = var.azure.location

  ip_configurations {
    private_ip_allocation_method = "Dynamic"
    subnet_id                    = azurerm_subnet.inbound_endpoint_snet[0].id
  }

  tags = var.tags
}

# Outbound Endpoint - allows Azure to query AWS private DNS zones
resource "azurerm_private_dns_resolver_outbound_endpoint" "main" {
  # name                    = provider::azuredx::resource_name(merge(local.azure_naming_config, { resource_type = "private_dns_resolver_outbound_endpoint" }))
  name                    = "private-dns-resolver-outbound-endpoint"
  private_dns_resolver_id = azurerm_private_dns_resolver.main.id
  location                = var.azure.location
  subnet_id               = azurerm_subnet.outbound_endpoint_snet.id

  tags = var.tags
}

# DNS Forwarding Ruleset
resource "azurerm_private_dns_resolver_dns_forwarding_ruleset" "aws" {
  # name                                       = provider::azuredx::resource_name(merge(local.azure_naming_config, { resource_type = "private_dns_resolver_dns_forwarding_ruleset" }))
  name                                       = "aws-dns-forwarding-ruleset"
  resource_group_name                        = var.azure.resource_group_name
  location                                   = var.azure.location
  private_dns_resolver_outbound_endpoint_ids = [azurerm_private_dns_resolver_outbound_endpoint.main.id]

  tags = var.tags
}

# DNS Forwarding Rules for AWS domains
resource "azurerm_private_dns_resolver_forwarding_rule" "aws_domains" {
  for_each = toset(concat([
    "aws",
    "internal.aws",
    "aws.local",
    "compute.internal",
    "rds.amazonaws.com",
    "elasticache.amazonaws.com",
  ], var.aws.private_dns_zones))

  name                      = replace(each.value, ".", "-")
  dns_forwarding_ruleset_id = azurerm_private_dns_resolver_dns_forwarding_ruleset.aws.id
  domain_name               = "${each.value}."
  enabled                   = true

  dynamic "target_dns_servers" {
    for_each = local.aws_inbound_ip_addresses
    content {
      ip_address = target_dns_servers.value
      port       = 53
    }
  }
}

# Virtual Network Link - Associates the ruleset with the VNet
resource "azurerm_private_dns_resolver_virtual_network_link" "main" {
  # name                      = provider::azuredx::resource_name(merge(local.azure_naming_config, { resource_type = "private_dns_resolver_virtual_network_link" }))
  name                      = "vnet-link"
  dns_forwarding_ruleset_id = azurerm_private_dns_resolver_dns_forwarding_ruleset.aws.id
  virtual_network_id        = var.azure.vnet_id
}
