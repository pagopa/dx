terraform {
  required_providers {
    dx = {
      source = "pagopa-dx/aws"
    }
    aws = {
      source = "hashicorp/aws"
    }
  }
}

provider "dx" {
  prefix      = "dx"
  environment = "d"
  region      = "eus1"
}

provider "aws" {
  region = "eu-south-1"
}

# Create a VPC first
resource "aws_vpc" "example" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "example-vpc"
  }
}

# Use the dx provider to allocate an available CIDR block
resource "dx_available_subnet_cidr" "example" {
  vpc_id        = aws_vpc.example.id
  prefix_length = 24
}

# Create a subnet using the allocated CIDR
resource "aws_subnet" "example" {
  vpc_id                  = aws_vpc.example.id
  cidr_block              = dx_available_subnet_cidr.example.cidr_block
  availability_zone       = "eu-west-1a"
  map_public_ip_on_launch = true

  tags = {
    Name = "example-subnet"
  }
}

# Output the allocated CIDR block
output "allocated_cidr" {
  value       = dx_available_subnet_cidr.example.cidr_block
  description = "The CIDR block allocated for the subnet"
}

output "subnet_id" {
  value       = aws_subnet.example.id
  description = "The ID of the created subnet"
}
