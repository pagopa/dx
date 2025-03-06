terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4"
    }
  }
}

module "naming_convention" {
  source  = "pagopa/dx-azure-naming-convention/azurerm"
  version = "~> 0"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    app_name        = var.environment.app_name
    instance_number = var.environment.instance_number
  }
}

#---------------------------#
# CONTAINER APP ENVIRONMENT #
#---------------------------#

resource "azurerm_container_app_environment" "this" {
  name                       = "${module.naming_convention.prefix}-cae-${module.naming_convention.suffix}"
  location                   = var.environment.location
  resource_group_name        = var.resource_group_name
  log_analytics_workspace_id = var.log_analytics_workspace_id

  infrastructure_subnet_id       = var.subnet_id == null ? azurerm_subnet.this[0].id : var.subnet_id
  internal_load_balancer_enabled = true

  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
    minimum_count         = 1
    maximum_count         = 1
  }

  zone_redundancy_enabled = var.zone_redundant

  lifecycle {
    ignore_changes = [
      infrastructure_resource_group_name,
      workload_profile,
    ]
  }

  timeouts {
    create = "60m"
  }

  tags = var.tags
}