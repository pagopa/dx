module "core" {
  source = "../../"

  environment = local.environment

  # Basic configuration for development/testing
  vpc_cidr = "10.1.0.0/16"

  # Cost-optimized configuration
  nat_gateway_count = 0 # Disable NAT gateways for testing

  tags = local.tags
}
