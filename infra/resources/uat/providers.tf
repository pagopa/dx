terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }

    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
    }

    azuredx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.0"
    }

    azapi = {
      source  = "Azure/azapi"
      version = "2.8.0"
    }

    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }

    awscc = {
      source  = "hashicorp/awscc"
      version = "~> 1.0"
    }

    awsdx = {
      source  = "pagopa-dx/aws"
      version = "~> 0.0"
    }

    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "dx-u-itn-tfstate-rg-01"
    storage_account_name = "dxuitntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.resources.uat.tfstate"
    use_azuread_auth     = true
  }
}

# Default provider configuration
provider "azurerm" {
  features {}
  storage_use_azuread = true
}

provider "azuredx" {}

provider "azapi" {}

provider "aws" {
  region = "eu-south-1"
}

provider "awsdx" {}

