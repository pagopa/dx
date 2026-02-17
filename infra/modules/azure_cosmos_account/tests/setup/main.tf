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

data "azurerm_user_assigned_identity" "integration_github" {
  name                = "dx-d-itn-devex-integration-id-01"
  resource_group_name = "dx-d-itn-devex-rg-01"
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

data "azurerm_private_dns_zone" "cosmos" {
  name                = "privatelink.documents.azure.com"
  resource_group_name = data.azurerm_resource_group.network.name
}

resource "azurerm_resource_group" "sut" {
  name     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "resource_group" }))
  location = var.environment.location
  tags     = var.tags
}

resource "azurerm_user_assigned_identity" "uai" {
  name                = provider::dx::resource_name(merge(local.naming_config, { resource_type = "managed_identity", name = "cosno" }))
  resource_group_name = azurerm_resource_group.sut.name
  location            = azurerm_resource_group.sut.location
  tags                = var.tags
}

resource "random_integer" "kv_instance" {
  min = 1
  max = 99
}

#tfsec:ignore:AVD-AZU-0013
resource "azurerm_key_vault" "kv" {
  name                          = provider::dx::resource_name(merge(local.naming_config, { resource_type = "key_vault", domain = "int", instance_number = random_integer.kv_instance.result }))
  location                      = azurerm_resource_group.sut.location
  resource_group_name           = azurerm_resource_group.sut.name
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  sku_name                      = "standard"
  soft_delete_retention_days    = 7
  purge_protection_enabled      = true
  public_network_access_enabled = true
  rbac_authorization_enabled    = true
  tags                          = var.tags
}

resource "azurerm_role_assignment" "kv_cosmos_uai" {
  principal_id         = azurerm_user_assigned_identity.uai.principal_id
  scope                = azurerm_key_vault.kv.id
  role_definition_name = "Key Vault Crypto Officer"
  description          = "Allow Cosmos user-assigned identity to manage keys"
}

resource "azurerm_role_assignment" "integration_keyvault_key_officer" {
  principal_id         = data.azurerm_user_assigned_identity.integration_github.principal_id
  scope                = azurerm_key_vault.kv.id
  role_definition_name = "Key Vault Crypto Officer"
  description          = "Allow GitHub workflow to access the key"
}

resource "azurerm_key_vault_key" "cmk" {
  name            = provider::dx::resource_name(merge(local.naming_config, { resource_type = "customer_key_cosmos_db_nosql" }))
  key_vault_id    = azurerm_key_vault.kv.id
  key_type        = "RSA"
  key_size        = 2048
  key_opts        = ["wrapKey", "unwrapKey"]
  expiration_date = timeadd(timestamp(), "2h")

  depends_on = [azurerm_role_assignment.kv_cosmos_uai]
}

output "pep_id" {
  value = data.azurerm_subnet.pep.id
}

output "resource_group_name" {
  value = azurerm_resource_group.sut.name
}

output "pvt_service_connection_name" {
  value = provider::dx::resource_name(merge(local.naming_config, { resource_type = "cosmos_private_endpoint" }))
}

output "private_dns_zone_resource_group_name" {
  value = data.azurerm_resource_group.network.name
}

output "uai_id" {
  value = azurerm_user_assigned_identity.uai.id
}

output "kv_key_id" {
  value = azurerm_key_vault_key.cmk.versionless_id
}

output "private_dns_zone_cosmos" {
  value = data.azurerm_private_dns_zone.cosmos.id
}
