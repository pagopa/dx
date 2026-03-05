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
  }

  backend "http" {
    address = "https://stategraph.dev.dx.pagopa.it/api/v1/states/backend/d21769c8-a0cb-46c4-95c7-7c493bf621a8"
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

provider "aws" {
  alias  = "eu-central-1"
  region = "eu-central-1"
}

provider "awscc" {
  alias  = "eu-central-1"
  region = "eu-central-1"
}

provider "aws" {
  alias  = "us-east-1"
  region = "us-east-1"
}

provider "awsdx" {}

