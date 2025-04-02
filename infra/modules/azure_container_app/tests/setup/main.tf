terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.110, < 5.0"
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
}

module "naming_convention" {
  source = "../../../azure_naming_convention"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    app_name        = var.environment.app_name
    instance_number = var.environment.instance_number
  }
}

data "azurerm_resource_group" "rg" {
  name = "${var.environment.prefix}-${var.environment.env_short}-itn-test-rg-${module.naming_convention.suffix}"
}

data "azurerm_log_analytics_workspace" "logs" {
  name                = "${var.environment.prefix}-${var.environment.env_short}-itn-common-log-${module.naming_convention.suffix}"
  resource_group_name = "${var.environment.prefix}-${var.environment.env_short}-itn-common-rg-${module.naming_convention.suffix}"
}

data "azurerm_container_app_environment" "cae" {
  name                = "${var.environment.prefix}-${var.environment.env_short}-itn-github-runner-cae-${module.naming_convention.suffix}"
  resource_group_name = "${var.environment.prefix}-${var.environment.env_short}-itn-github-runner-rg-${module.naming_convention.suffix}"
}

data "azurerm_key_vault" "kv" {
  name                = "${var.environment.prefix}-${var.environment.env_short}-itn-common-kv-${module.naming_convention.suffix}"
  resource_group_name = "${var.environment.prefix}-${var.environment.env_short}-itn-common-rg-${module.naming_convention.suffix}"
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
