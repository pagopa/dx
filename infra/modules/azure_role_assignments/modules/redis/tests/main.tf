terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.114, < 5.0"
    }
  }
}

provider "azurerm" {
  features {}
  skip_provider_registration = true
}

module "redis_role_assignments" {
  source = "../"

  principal_id    = var.principal_id
  subscription_id = var.subscription_id
  redis           = var.redis
}
