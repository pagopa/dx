locals {
  existing_resources = {
    prefix          = var.environment.prefix
    environment     = var.environment.env_short
    location        = var.environment.location
    domain          = ""
    name            = var.test_kind
    instance_number = tonumber(var.environment.instance_number)
  }
}

data "azurerm_client_config" "current" {}

data "azurerm_resource_group" "test" {
  name = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "resource_group" }))
}

data "azurerm_log_analytics_workspace" "logs" {
  name                = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "log_analytics" }))
  resource_group_name = data.azurerm_resource_group.test.name
}

resource "azurerm_resource_group" "sut" {
  name     = provider::dx::resource_name(merge(var.environment, { resource_type = "resource_group" }))
  location = var.environment.location

  tags = var.tags
}

# Random base instance number regenerated on every test run to ensure isolation
# across concurrent or repeated test executions.
# Base range (10–24) ensures all derived instance numbers stay within 10–99.
resource "random_integer" "instance_base" {
  min = 10
  max = 24
  keepers = {
    run_timestamp = timestamp()
  }
}

resource "azurerm_container_app_environment" "sut" {
  name                       = provider::dx::resource_name(merge(var.environment, { resource_type = "container_app_environment" }))
  resource_group_name        = azurerm_resource_group.sut.name
  location                   = var.environment.location
  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.logs.id

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

resource "random_integer" "key_vault_instance" {
  min = 1
  max = 99
}

resource "azurerm_user_assigned_identity" "key_vault_secret" {
  name                = provider::dx::resource_name(merge(var.environment, { resource_type = "managed_identity", app_name = "kv" }))
  resource_group_name = azurerm_resource_group.sut.name
  location            = azurerm_resource_group.sut.location

  tags = var.tags
}

#trivy:ignore:AVD-AZU-0013
#trivy:ignore:AVD-AZU-0016
#trivy:ignore:AVD-AZU-0017
resource "azurerm_key_vault" "sut" {
  name = provider::dx::resource_name(merge(var.environment, {
    resource_type   = "key_vault"
    instance_number = random_integer.key_vault_instance.result
  }))
  location                      = azurerm_resource_group.sut.location
  resource_group_name           = azurerm_resource_group.sut.name
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  sku_name                      = "standard"
  soft_delete_retention_days    = 7
  purge_protection_enabled      = false
  public_network_access_enabled = true
  rbac_authorization_enabled    = true

  tags = var.tags
}

resource "azurerm_role_assignment" "key_vault_admin" {
  scope                = azurerm_key_vault.sut.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "key_vault_secret_user" {
  scope                = azurerm_key_vault.sut.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.key_vault_secret.principal_id
}

#trivy:ignore:AVD-AZU-0015
#trivy:ignore:AVD-AZU-0016
#trivy:ignore:AVD-AZU-0017
resource "azurerm_key_vault_secret" "container_app" {
  name         = "container-app-integration"
  value        = "integration-test-secret-value"
  key_vault_id = azurerm_key_vault.sut.id

  depends_on = [azurerm_role_assignment.key_vault_admin]
}

output "subscription_id" {
  value = data.azurerm_client_config.current.subscription_id
}

output "resource_group_name" {
  value = azurerm_resource_group.sut.name
}

output "container_app_environment_id" {
  value = azurerm_container_app_environment.sut.id
}

output "log_analytics_workspace_id" {
  value = data.azurerm_log_analytics_workspace.logs.id
}

output "key_vault_secret_id" {
  value = azurerm_key_vault_secret.container_app.id
}

output "key_vault_secret_user_identity_id" {
  value = azurerm_user_assigned_identity.key_vault_secret.id
}

output "instance_numbers" {
  value = {
    default     = tostring(random_integer.instance_base.result)
    development = tostring(random_integer.instance_base.result + 25)
    autoscaler  = tostring(random_integer.instance_base.result + 50)
  }
}
