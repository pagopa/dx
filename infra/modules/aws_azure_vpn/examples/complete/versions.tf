terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
  }
}

provider "aws" {
  region = local.aws_region

  default_tags {
    tags = local.tags
  }
}

provider "azurerm" {
  features {}
}
