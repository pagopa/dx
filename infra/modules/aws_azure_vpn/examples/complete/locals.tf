locals {
  # Environment configuration
  environment = {
    prefix          = "dx"
    env_short       = "d"
    app_name        = "vpn-example"
    instance_number = "01"
  }

  # AWS and Azure regions
  aws_region     = "eu-south-1"
  azure_location = "italynorth"

  # Common tags for all resources
  tags = {
    CreatedBy   = "Terraform"
    Environment = "Development"
    Owner       = "DevEx"
    Source      = "https://github.com/pagopa/dx/modules/aws_azure_vpn/examples/complete"
    CostCenter  = "TS700 - ENGINEERING"
    Purpose     = "AWS-Azure VPN Demo"
    UseCase     = "Cross-cloud connectivity"
  }
}
