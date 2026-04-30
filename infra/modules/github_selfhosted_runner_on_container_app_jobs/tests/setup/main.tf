locals {
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

data "azurerm_resource_group" "network" {
  name = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "resource_group" }))
}

data "azurerm_virtual_network" "vnet" {
  name                = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "virtual_network" }))
  resource_group_name = data.azurerm_resource_group.network.name
}

data "azurerm_log_analytics_workspace" "int" {
  name                = provider::dx::resource_name(merge(var.environment, { app_name = "integration", domain = "", resource_type = "log_analytics" }))
  resource_group_name = provider::dx::resource_name(merge(var.environment, { app_name = "integration", domain = "", resource_type = "resource_group" }))
}

resource "azurerm_resource_group" "sut" {
  name     = provider::dx::resource_name(merge(var.environment, { resource_type = "resource_group" }))
  location = var.environment.location

  tags = var.tags
}

resource "dx_available_subnet_cidr" "cae_subnet" {
  virtual_network_id = data.azurerm_virtual_network.vnet.id
  prefix_length      = 27
}

resource "azurerm_subnet" "cae" {
  name                 = provider::dx::resource_name(merge(var.environment, { resource_type = "subnet", name = "cae" }))
  resource_group_name  = data.azurerm_resource_group.network.name
  virtual_network_name = data.azurerm_virtual_network.vnet.name
  address_prefixes     = [dx_available_subnet_cidr.cae_subnet.cidr_block]

  delegation {
    name = "Microsoft.App/environments"
    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_container_app_environment" "runner" {
  name                           = provider::dx::resource_name(merge(var.environment, { resource_type = "container_app_environment" }))
  resource_group_name            = azurerm_resource_group.sut.name
  location                       = var.environment.location
  internal_load_balancer_enabled = false
  infrastructure_subnet_id       = azurerm_subnet.cae.id
  log_analytics_workspace_id     = data.azurerm_log_analytics_workspace.int.id

  zone_redundancy_enabled = false

  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }

  lifecycle {
    ignore_changes = [
      infrastructure_resource_group_name,
    ]
  }

  timeouts {
    create = "60m"
  }

  tags = var.tags
}

resource "random_integer" "kv_instance" {
  min = 1
  max = 99
}

#tfsec:ignore:AVD-AZU-0013
#tfsec:ignore:AVD-AZU-0016
#tfsec:ignore:AVD-AZU-0017
resource "azurerm_key_vault" "test" {
  name                          = provider::dx::resource_name(merge(var.environment, { resource_type = "key_vault", instance_number = random_integer.kv_instance.result }))
  location                      = azurerm_resource_group.sut.location
  resource_group_name           = azurerm_resource_group.sut.name
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  sku_name                      = "standard"
  soft_delete_retention_days    = 7
  purge_protection_enabled      = false
  public_network_access_enabled = true
  rbac_authorization_enabled    = true
  tags                          = var.tags
}

resource "azurerm_role_assignment" "kv_admin" {
  scope                = azurerm_key_vault.test.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id
}

#tfsec:ignore:AVD-AZU-0015
#tfsec:ignore:AVD-AZU-0016
#tfsec:ignore:AVD-AZU-0017
resource "azurerm_key_vault_secret" "pat" {
  name         = "github-runner-pat"
  value        = "ghp_test_dummy_value_for_integration_test"
  key_vault_id = azurerm_key_vault.test.id
  depends_on   = [azurerm_role_assignment.kv_admin]
}

#tfsec:ignore:AVD-AZU-0015
#tfsec:ignore:AVD-AZU-0017
resource "azurerm_key_vault_secret" "app_id" {
  name         = "github-runner-app-id"
  value        = "12345"
  key_vault_id = azurerm_key_vault.test.id
  depends_on   = [azurerm_role_assignment.kv_admin]
}

#tfsec:ignore:AVD-AZU-0015
#tfsec:ignore:AVD-AZU-0017
resource "azurerm_key_vault_secret" "app_installation_id" {
  name         = "github-runner-app-installation-id"
  value        = "67890"
  key_vault_id = azurerm_key_vault.test.id
  depends_on   = [azurerm_role_assignment.kv_admin]
}

#tfsec:ignore:AVD-AZU-0015
#tfsec:ignore:AVD-AZU-0017
resource "azurerm_key_vault_secret" "app_key" {
  name         = "github-runner-app-key"
  value        = "dummy-rsa-key-for-integration-test"
  key_vault_id = azurerm_key_vault.test.id
  depends_on   = [azurerm_role_assignment.kv_admin]
}

output "resource_group_name" {
  value = azurerm_resource_group.sut.name
}

output "container_app_environment_id" {
  value = azurerm_container_app_environment.runner.id
}

output "container_app_environment_location" {
  value = azurerm_container_app_environment.runner.location
}

output "key_vault_name" {
  value = azurerm_key_vault.test.name
}

output "key_vault_resource_group_name" {
  value = azurerm_resource_group.sut.name
}
