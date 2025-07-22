terraform {
  required_providers {
    dx = {
      source = "pagopa-dx/aws"
    }
  }
}

provider "dx" {
  prefix      = "dx"
  environment = "d"
  region      = "eus1"
}

# Example resource name for S3 bucket
output "s3_bucket_name" {
  value = provider::dx::resource_name({
    prefix          = "dx",
    environment     = "d",
    region          = "eu",
    domain          = "storage",
    name            = "data",
    resource_type   = "s3_bucket",
    instance_number = "1"
  })
}

# Example resource name for Lambda function
output "lambda_function_name" {
  value = provider::dx::resource_name({
    prefix          = "dx",
    environment     = "p",
    region          = "eus1",
    domain          = "processing",
    name            = "handler",
    resource_type   = "lambda_function",
    instance_number = "1"
  })
}

# Example resource name for VPC
output "vpc_name" {
  value = provider::dx::resource_name({
    prefix          = "dx",
    environment     = "u",
    region          = "euc1",
    name            = "main",
    resource_type   = "vpc",
    instance_number = "1"
  })
}
