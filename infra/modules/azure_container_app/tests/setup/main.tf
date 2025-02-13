terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.110, < 5.0"
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

data "azurerm_resource_group" "rg" {
  name = "${var.environment.prefix}-${var.environment.env_short}-itn-test-rg-${module.naming_convention.suffix}"
}

data "azurerm_subnet" "pep" {
  name                 = "${var.environment.prefix}-${var.environment.env_short}-itn-pep-snet-01"
  virtual_network_name = "${var.environment.prefix}-${var.environment.env_short}-itn-common-vnet-01"
  resource_group_name  = "${var.environment.prefix}-${var.environment.env_short}-itn-network-rg-01"
}

output "resource_group_name" {
  value = data.azurerm_resource_group.rg.name
}

output "pep_snet_id" {
  value = data.azurerm_subnet.pep.id
}