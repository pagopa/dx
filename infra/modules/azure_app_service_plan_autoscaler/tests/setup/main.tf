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
  project = module.naming_convention.project
}


data "azurerm_subnet" "pep" {
  name                 = "${local.project}-pep-snet-01"
  virtual_network_name = "${local.project}-common-vnet-01"
  resource_group_name  = "${local.project}-network-rg-01"
}

data "azurerm_resource_group" "rg" {
  name = "${var.environment.prefix}-${var.environment.env_short}-itn-test-rg-${module.naming_convention.suffix}"
}

module "azure_app_service" {
  source = "../../../azure_app_service"

  environment         = var.environment
  tier                = "s"
  resource_group_name = data.azurerm_resource_group.rg.name

  virtual_network = {
    name                = "${local.project}-common-vnet-01"
    resource_group_name = "${local.project}-network-rg-01"
  }
  subnet_pep_id = data.azurerm_subnet.pep.id
  subnet_cidr   = "10.50.250.0/24"

  app_settings      = {}
  slot_app_settings = {}

  health_check_path = "/health"

  tags = var.tags
}

output "app_service_plan_id" {
  value = module.azure_app_service.app_service.plan.id
}

output "app_service" {
  value = {
    name = module.azure_app_service.app_service.app_service.name
    id   = module.azure_app_service.app_service.app_service.id
  }
}

output "resource_group_name" {
  value = data.azurerm_resource_group.rg.name
}