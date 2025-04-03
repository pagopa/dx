terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.110, < 5.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = ">= 0.0.5, < 1.0.0"
    }
  }
}

locals {
  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_container_app/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Create Container App for test"
  }

  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }
}

data "azurerm_resource_group" "rg" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "test",
    resource_type = "resource_group"
  }))
}

data "azurerm_log_analytics_workspace" "logs" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "common",
    resource_type = "log_analytics"
  }))
  resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "common",
    resource_type = "resource_group"
  }))
}

data "azurerm_container_app_environment" "cae" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "github-runner",
    resource_type = "container_app_environment"
  }))
  resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "github-runner",
    resource_type = "resource_group"
  }))
}

data "azurerm_key_vault" "kv" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "common",
    resource_type = "key_vault"
  }))
  resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "common",
    resource_type = "resource_group"
  }))
}

resource "azurerm_key_vault_secret" "test1" {
  name            = "TESTSECRET1"
  value           = "value1"
  key_vault_id    = data.azurerm_key_vault.kv.id
  expiration_date = timeadd(timestamp(), "30m")
  content_type    = "application/text"
}

resource "azurerm_key_vault_secret" "test2" {
  name            = "TESTSECRET2"
  value           = "value2"
  key_vault_id    = data.azurerm_key_vault.kv.id
  expiration_date = timeadd(timestamp(), "30m")
  content_type    = "application/text"
}

output "resource_group_name" {
  value = data.azurerm_resource_group.rg.name
}

output "log_analytics_id" {
  value = data.azurerm_log_analytics_workspace.logs.id
}

output "container_app_environment_id" {
  value = data.azurerm_container_app_environment.cae.id
}

output "key_vault_secret1" {
  value = {
    secret_id = azurerm_key_vault_secret.test1.versionless_id
    name      = azurerm_key_vault_secret.test1.name
  }
}

output "key_vault_secret2" {
  value = {
    secret_id = azurerm_key_vault_secret.test2.versionless_id
    name      = azurerm_key_vault_secret.test2.name
  }
}

output "tags" {
  value = local.tags
}
