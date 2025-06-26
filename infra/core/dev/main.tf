module "core" {
  source = "../_modules/core_infra"

  environment = local.environment
  virtual_network_cidr = local.virtual_network_cidr
  tags = local.tags
}
