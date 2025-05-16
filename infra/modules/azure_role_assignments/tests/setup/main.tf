terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.114, < 5.0"
    }
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

# DATAS

data "azurerm_virtual_network" "vnet" {
  name                = "${module.naming_convention.project}-common-vnet-01"
  resource_group_name = "${module.naming_convention.project}-network-rg-01"
}

data "azurerm_subnet" "pep" {
  name                 = "${module.naming_convention.project}-pep-snet-01"
  virtual_network_name = "${module.naming_convention.project}-common-vnet-01"
  resource_group_name  = "${module.naming_convention.project}-network-rg-01"
}

data "azurerm_subscription" "current" {}

data "azurerm_resource_group" "rg" {
  name = "${var.environment.prefix}-${var.environment.env_short}-itn-test-rg-${module.naming_convention.suffix}"

}

# RESOURCES

locals {
  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_role_assignments/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Create role assignments for test"
  }
}

resource "azurerm_user_assigned_identity" "id" {
  location            = data.azurerm_resource_group.rg.location
  resource_group_name = data.azurerm_resource_group.rg.name
  name                = "${module.naming_convention.prefix}-id-role-${module.naming_convention.suffix}"

  tags = local.tags
}

resource "azurerm_servicebus_namespace" "this" {
  name                = "dx-d-itn-playground-sb-01"
  location            = data.azurerm_resource_group.rg.location
  resource_group_name = data.azurerm_resource_group.rg.name
  sku                 = "Standard"

  tags = local.tags
}

# OUTPUTS

output "pep_id" {
  value = data.azurerm_subnet.pep.id
}

output "resource_group_name" {
  value = data.azurerm_resource_group.rg.name
}

output "vnet" {
  value = {
    name                = data.azurerm_virtual_network.vnet.name
    resource_group_name = data.azurerm_virtual_network.vnet.resource_group_name
  }
}

output "identity_name" {
  value = azurerm_user_assigned_identity.id.name
}

output "principal_id" {
  value = azurerm_user_assigned_identity.id.principal_id
}

output "subscription_id" {
  value = data.azurerm_subscription.current.subscription_id
}

output "sb_namespace" {
  value = {
    name                = azurerm_servicebus_namespace.this.name
    resource_group_name = azurerm_servicebus_namespace.this.resource_group_name
    id                  = azurerm_servicebus_namespace.this.id
  }
}
