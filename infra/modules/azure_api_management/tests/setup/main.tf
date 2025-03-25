terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.111.0, < 5.0"
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

locals {
  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_api_management/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Create APIM for test"
  }
}

data "azurerm_virtual_network" "vnet" {
  name                = "dx-d-itn-common-vnet-01"
  resource_group_name = "dx-d-itn-network-rg-01"
}

resource "azurerm_subnet" "subnet" {
  name                 = "${module.naming_convention.project}-apim-snet-test-${module.naming_convention.suffix}"
  virtual_network_name = data.azurerm_virtual_network.vnet.name
  resource_group_name  = data.azurerm_virtual_network.vnet.resource_group_name
  address_prefixes     = ["10.50.250.0/24"]
}

resource "azurerm_public_ip" "pip" {
  name                = "${module.naming_convention.project}-apim-pip-test-${module.naming_convention.suffix}"
  resource_group_name = data.azurerm_virtual_network.vnet.resource_group_name
  location            = var.environment.location
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = ["1", "2"]

  tags = local.tags
}

data "azurerm_resource_group" "rg" {
  name = "${var.environment.prefix}-${var.environment.env_short}-itn-test-rg-${module.naming_convention.suffix}"
}

output "subnet_id" {
  value = azurerm_subnet.subnet.id
}

output "pip_id" {
  value = azurerm_public_ip.pip.id
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

output "tags" {
  value = local.tags
}
