terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>4"
    }
  }
}

data "azurerm_subscription" "current" {}

data "azurerm_resource_group" "rg" {
  name = "${var.environment.prefix}-${var.environment.env_short}-itn-test-rg-${var.environment.instance_number}"
}

output "resource_group_name" {
  value = data.azurerm_resource_group.rg.name
}

output "subscription_id" {
  value = data.azurerm_subscription.current.id
}
