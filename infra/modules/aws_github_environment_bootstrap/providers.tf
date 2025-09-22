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

    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.environment.region
  default_tags {
    tags = local.tags
  }
}

provider "dx" {
  prefix      = var.environment.prefix
  environment = var.environment.env_short
  region      = var.environment.region
}
