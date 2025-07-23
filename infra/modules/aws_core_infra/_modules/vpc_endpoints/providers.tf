terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    dx = {
      source  = "pagopa-dx/aws"
      version = "~> 0.0"
    }
  }
}
