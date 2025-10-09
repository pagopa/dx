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

    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.0"
    }

    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    awsdx = {
      source  = "pagopa-dx/aws"
      version = "~> 0.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "dx-d-itn-tfstate-rg-01"
    storage_account_name = "dxditntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.resources.dev.tfstate"
    use_azuread_auth     = true
  }
}

# Default provider configuration
provider "azurerm" {
  features {}
  storage_use_azuread = true
}

provider "dx" {}

provider "aws" {
  region = "eu-south-1"
}

provider "aws" {
  alias  = "eu-central-1"
  region = "eu-central-1"
}

provider "aws" {
  alias  = "us-east-1"
  region = "us-east-1"
}

provider "awsdx" {}
