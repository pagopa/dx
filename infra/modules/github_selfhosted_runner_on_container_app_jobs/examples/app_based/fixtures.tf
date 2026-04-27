resource "random_integer" "kv_instance" {
  min = 1
  max = 99
}

resource "azurerm_resource_group" "sut" {
  name     = provider::dx::resource_name(merge(local.environment, { resource_type = "resource_group" }))
  location = local.environment.location

  tags = local.tags
}

resource "dx_available_subnet_cidr" "cae" {
  virtual_network_id = data.azurerm_virtual_network.e2e.id
  prefix_length      = 27
}

resource "azurerm_subnet" "cae" {
  name                 = provider::dx::resource_name(merge(local.environment, { resource_type = "container_app_subnet" }))
  resource_group_name  = data.azurerm_resource_group.e2e.name
  virtual_network_name = data.azurerm_virtual_network.e2e.name
  address_prefixes     = [dx_available_subnet_cidr.cae.cidr_block]

  delegation {
    name = "Microsoft.App/environments"

    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_container_app_environment" "runner" {
  name                           = provider::dx::resource_name(merge(local.environment, { resource_type = "container_app_environment" }))
  resource_group_name            = azurerm_resource_group.sut.name
  location                       = local.environment.location
  internal_load_balancer_enabled = false
  infrastructure_subnet_id       = azurerm_subnet.cae.id
  log_analytics_workspace_id     = data.azurerm_log_analytics_workspace.e2e.id
  zone_redundancy_enabled        = false

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

  tags = local.tags
}

#tfsec:ignore:AVD-AZU-0013
#tfsec:ignore:AVD-AZU-0016
resource "azurerm_key_vault" "test" {
  name                          = provider::dx::resource_name(merge(local.environment, { resource_type = "key_vault", instance_number = random_integer.kv_instance.result }))
  location                      = azurerm_resource_group.sut.location
  resource_group_name           = azurerm_resource_group.sut.name
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  sku_name                      = "standard"
  soft_delete_retention_days    = 7
  purge_protection_enabled      = false
  public_network_access_enabled = true
  rbac_authorization_enabled    = true
  tags                          = local.tags
}

resource "azurerm_role_assignment" "kv_admin" {
  scope                = azurerm_key_vault.test.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id
}

#tfsec:ignore:AVD-AZU-0015
#tfsec:ignore:AVD-AZU-0016
#tfsec:ignore:AVD-AZU-0017
resource "azurerm_key_vault_secret" "github_app_id" {
  name         = "github-runner-app-id"
  value        = local.github_app.id
  key_vault_id = azurerm_key_vault.test.id
  depends_on   = [azurerm_role_assignment.kv_admin]
}

#tfsec:ignore:AVD-AZU-0015
#tfsec:ignore:AVD-AZU-0016
#tfsec:ignore:AVD-AZU-0017
resource "azurerm_key_vault_secret" "github_app_installation_id" {
  name         = "github-runner-app-installation-id"
  value        = local.github_app.installation_id
  key_vault_id = azurerm_key_vault.test.id
  depends_on   = [azurerm_role_assignment.kv_admin]
}

#tfsec:ignore:AVD-AZU-0015
#tfsec:ignore:AVD-AZU-0016
#tfsec:ignore:AVD-AZU-0017
resource "azurerm_key_vault_secret" "github_app_private_key" {
  name         = "github-runner-app-key"
  value        = local.github_app.private_key
  key_vault_id = azurerm_key_vault.test.id
  depends_on   = [azurerm_role_assignment.kv_admin]
}
