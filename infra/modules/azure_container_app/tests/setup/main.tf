terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.110, < 5.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = "~>0.0"
    }
  }
}

locals {
  naming_config = {
    prefix      = var.environment.prefix,
    environment = var.environment.env_short,
    location = tomap({
      "italynorth" = "itn",
      "westeurope" = "weu"
    })[var.environment.location]
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

output "resource_group_name" {
  value = data.azurerm_resource_group.rg.name
}

output "log_analytics_id" {
  value = data.azurerm_log_analytics_workspace.logs.id
}

output "container_app_environment_id" {
  value = data.azurerm_container_app_environment.cae.id
}