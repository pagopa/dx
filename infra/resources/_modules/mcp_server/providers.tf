terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.us_east_1]
    }
    awscc = {
      source = "hashicorp/awscc"
    }
    awsdx = {
      source = "pagopa-dx/aws"
    }
    azurerm = {
      source = "hashicorp/azurerm"
    }
  }
}
