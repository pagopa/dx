locals {
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location,
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  existing_resources = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location,
    domain          = ""
    name            = var.test_kind,
    instance_number = tonumber(var.environment.instance_number),
  }
}

data "azurerm_client_config" "current" {}

data "azurerm_user_assigned_identity" "test" {
  name                = provider::dx::resource_name(merge(local.existing_resources, { domain = "devex", resource_type = "managed_identity" }))
  resource_group_name = provider::dx::resource_name(merge(local.existing_resources, { name = "devex", resource_type = "resource_group" }))
}

data "azurerm_private_dns_zone" "kv" {
  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = data.azurerm_resource_group.network.name
}

data "azurerm_resource_group" "test" {
  name = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "resource_group" }))
}

data "azurerm_resource_group" "network" {
  name = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "resource_group", name = "network" }))
}

data "azurerm_virtual_network" "vnet" {
  name                = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "virtual_network" }))
  resource_group_name = data.azurerm_resource_group.test.name
}

data "azurerm_subnet" "pep" {
  name                 = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "subnet", name = "pep" }))
  resource_group_name  = data.azurerm_resource_group.test.name
  virtual_network_name = data.azurerm_virtual_network.vnet.name
}

data "azurerm_private_dns_zone" "appcs" {
  name                = "privatelink.azconfig.io"
  resource_group_name = data.azurerm_resource_group.network.name
  tags                = var.tags
}

resource "azurerm_resource_group" "sut" {
  name     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "resource_group" }))
  location = var.environment.location
  tags     = var.tags
}

resource "random_integer" "appcs_kv_instance" {
  min = 1
  max = 99
}

# Generate a random base instance number tied to the current timestamp.
# Using timestamp() as a keeper forces regeneration on every test execution,
# ensuring test runs are isolated from each other even with persistent state.
# The base range (10-24) guarantees that all 4 derived instance numbers
# (base, base+25, base+50, base+75) stay within the valid 2-digit range (10-99).
resource "random_integer" "instance_base" {
  min = 10
  max = 24
  keepers = {
    run_timestamp = timestamp()
  }
}

resource "azurerm_key_vault" "kv" {
  name                          = provider::dx::resource_name(merge(local.naming_config, { resource_type = "key_vault", instance_number = random_integer.appcs_kv_instance.result }))
  location                      = azurerm_resource_group.sut.location
  resource_group_name           = azurerm_resource_group.sut.name
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  rbac_authorization_enabled    = true
  sku_name                      = "standard"
  purge_protection_enabled      = true
  soft_delete_retention_days    = 7
  public_network_access_enabled = false

  network_acls {
    bypass         = "AzureServices"
    default_action = "Deny"
  }

  tags = var.tags
}

resource "azurerm_private_endpoint" "kv" {
  name                = provider::dx::resource_name(merge(local.naming_config, { resource_type = "key_vault_private_endpoint", domain = "int", instance_number = random_integer.appcs_kv_instance.result }))
  location            = azurerm_resource_group.sut.location
  resource_group_name = azurerm_resource_group.sut.name
  subnet_id           = data.azurerm_subnet.pep.id

  private_service_connection {
    name                           = provider::dx::resource_name(merge(local.naming_config, { resource_type = "key_vault_private_endpoint", domain = "int", instance_number = random_integer.appcs_kv_instance.result }))
    private_connection_resource_id = azurerm_key_vault.kv.id
    is_manual_connection           = false
    subresource_names              = ["vault"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.kv.id]
  }

  tags = var.tags
}

output "resource_group_name" {
  value = azurerm_resource_group.sut.name
}

output "subnet_pep_id" {
  value = data.azurerm_subnet.pep.id
}

output "private_dns_zone_resource_group_name" {
  value = data.azurerm_resource_group.network.name
}

output "private_dns_zone_appcs" {
  value = data.azurerm_private_dns_zone.appcs.id
}

output "virtual_network" {
  value = {
    name                = data.azurerm_virtual_network.vnet.name
    resource_group_name = data.azurerm_resource_group.network.name
  }
}

output "key_vaults" {
  value = [{
    name                = azurerm_key_vault.kv.name
    resource_group_name = azurerm_key_vault.kv.resource_group_name
    has_rbac_support    = true
    app_principal_ids   = [] # Empty in setup, will be filled by test scenario with actual principal IDs
  }]
}

output "subscription_id" {
  value = data.azurerm_client_config.current.subscription_id
}

output "managed_identity_principal_id" {
  value = data.azurerm_user_assigned_identity.test.principal_id
}

output "instance_numbers" {
  value = {
    default        = tostring(random_integer.instance_base.result)
    premium        = tostring(random_integer.instance_base.result + 25)
    developer      = tostring(random_integer.instance_base.result + 50)
    kv_integration = tostring(random_integer.instance_base.result + 75)
  }
}
