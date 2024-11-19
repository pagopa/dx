module "common_resources" {
  source = "../../"

  test_enable = true # set to false if you want to create all resources

  environment = local.environment

  virtual_network_cidr = "10.50.0.0/16"
  pep_subnet_cidr      = "10.50.2.0/23"

  vpn = {
    cidr_subnet              = "10.50.133.0/24"
    dnsforwarder_cidr_subnet = "10.50.252.8/29"
  }

  tags = local.tags
}