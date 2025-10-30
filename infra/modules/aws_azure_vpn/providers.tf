terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0, < 7.0"
    }

    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }

    azuredx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.0"
    }

    awsdx = {
      source  = "pagopa-dx/aws"
      version = "~> 0.0"
    }
  }
}
