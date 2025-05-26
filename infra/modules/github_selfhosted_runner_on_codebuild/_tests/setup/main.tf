terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.environment.location
}

# Minimal network or other resources needed for tests
#trivy:ignore:AVD-AWS-0178
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.app_prefix}-vpc-${local.app_suffix}"
  cidr = "10.0.0.0/16"

  azs             = ["eu-south-1a", "eu-south-1b", "eu-south-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true # For development environments

  tags = var.tags
}
