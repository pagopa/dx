# Networking module for AWS Core Infrastructure
# Creates VPC, Internet Gateway, and subnets across multiple availability zones

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
