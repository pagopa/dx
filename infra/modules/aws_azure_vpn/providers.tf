terraform {
  required_version = ">= 1.16.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0, < 7.0"
    }

    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 5.0.0, < 6.0.0"
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
}
