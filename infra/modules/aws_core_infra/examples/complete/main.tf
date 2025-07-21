module "core" {
  source = "../../"

  environment = local.environment

  # Network Configuration
  vpc_cidr = "10.0.0.0/16"

  # Feature flags
  nat_gateway_count = 3 # High availability with 3 NAT gateways
  vpn_enabled       = true

  tags = local.tags
}
