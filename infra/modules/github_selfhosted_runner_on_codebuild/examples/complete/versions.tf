terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.90.1"
    }
  }
}

provider "aws" {
  region = "eu-south-1"
  default_tags {
    tags = local.tags
  }
}