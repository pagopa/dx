terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 4.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = ">= 0.0.6, < 1.0.0"
    }
  }
}

locals {
  naming_config = {
    prefix          = var.environment.prefix
    environment     = var.environment.env_short
    location        = var.environment.location
    name            = var.environment.app_name
    instance_number = tonumber(var.environment.instance_number)
  }
}

# Azure Private DNS Resolver
resource "azurerm_private_dns_resolver" "main" {
  name                = provider::dx::resource_name(merge(local.naming_config, { resource_type = "private_dns_resolver" }))
  resource_group_name = var.resource_group_name
  location            = var.environment.location
  virtual_network_id  = var.virtual_network_id

  tags = var.tags
}

# Inbound Endpoint - allows AWS to query Azure private DNS zones
resource "azurerm_private_dns_resolver_inbound_endpoint" "main" {
  name                    = provider::dx::resource_name(merge(local.naming_config, { resource_type = "private_dns_resolver_inbound_endpoint" }))
  private_dns_resolver_id = azurerm_private_dns_resolver.main.id
  location                = var.environment.location
  subnet_id               = var.inbound_subnet_id

  ip_configurations {
    private_ip_allocation_method = "Dynamic"
  }

  tags = var.tags
}

# Outbound Endpoint - allows Azure to query AWS private DNS zones
resource "azurerm_private_dns_resolver_outbound_endpoint" "main" {
  name                    = provider::dx::resource_name(merge(local.naming_config, { resource_type = "private_dns_resolver_outbound_endpoint" }))
  private_dns_resolver_id = azurerm_private_dns_resolver.main.id
  location                = var.environment.location
  subnet_id               = var.outbound_subnet_id

  tags = var.tags
}

# DNS Forwarding Ruleset
resource "azurerm_private_dns_resolver_dns_forwarding_ruleset" "aws" {
  name                                       = provider::dx::resource_name(merge(local.naming_config, { resource_type = "private_dns_resolver_dns_forwarding_ruleset" }))
  resource_group_name                        = var.resource_group_name
  location                                   = var.environment.location
  private_dns_resolver_outbound_endpoint_ids = [azurerm_private_dns_resolver_outbound_endpoint.main.id]

  tags = var.tags
}

# DNS Forwarding Rules for AWS domains
resource "azurerm_private_dns_resolver_forwarding_rule" "aws_domains" {
  for_each = toset([
    "aws",
    "internal.aws",
    "aws.local",
    "compute.internal",
    "rds.amazonaws.com",
    "elasticache.amazonaws.com",
    "us-east-1.compute.internal",
    "us-west-2.compute.internal",
    "eu-west-1.compute.internal",
    "eu-central-1.compute.internal"
  ])

  name                      = replace(each.value, ".", "-")
  dns_forwarding_ruleset_id = azurerm_private_dns_resolver_dns_forwarding_ruleset.aws.id
  domain_name               = "${each.value}."
  enabled                   = true

  dynamic "target_dns_servers" {
    for_each = var.cross_cloud_dns_config.aws_resolver_inbound_ips
    content {
      ip_address = target_dns_servers.value
      port       = 53
    }
  }
}

# Virtual Network Link - Associates the ruleset with the VNet
resource "azurerm_private_dns_resolver_virtual_network_link" "main" {
  name                      = provider::dx::resource_name(merge(local.naming_config, { resource_type = "private_dns_resolver_virtual_network_link" }))
  dns_forwarding_ruleset_id = azurerm_private_dns_resolver_dns_forwarding_ruleset.aws.id
  virtual_network_id        = var.virtual_network_id
}
