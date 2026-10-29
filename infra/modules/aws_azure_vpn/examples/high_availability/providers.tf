terraform {
  required_version = ">= 1.17.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 5.0.0, < 6.0.0"
    }

    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
    }

    azuredx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.12"
    }

    awsdx = {
      source  = "pagopa-dx/aws"
      version = "~> 0.1"
    }
  }

  backend "azurerm" {
    resource_group_name  = "dx-u-itn-tfstate-rg-01"
    storage_account_name = "dxuitntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.example.uat.tfstate"
  }
}

# Default provider configuration
provider "azurerm" {
  features {}
}

provider "aws" {
  region = local.aws_environment.region
  default_tags {
    tags = local.tags
  }
}
