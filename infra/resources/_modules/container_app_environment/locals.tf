# Environment configuration for resource naming
locals {
  naming_config = {
    prefix          = var.environment.prefix
    environment     = var.environment.env_short
    location        = var.environment.location
    name            = "common"
    instance_number = var.environment.instance_number
  }
}
