terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
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

provider "aws" {
  region = var.aws.region
  default_tags {
    tags = local.tags
  }
}

provider "awsdx" {
  prefix      = var.environment.prefix
  environment = var.environment.env_short
  region      = var.aws.region
}


provider "azuredx" {
  prefix      = var.environment.prefix
  environment = var.environment.env_short
  location    = var.azure.location
}
