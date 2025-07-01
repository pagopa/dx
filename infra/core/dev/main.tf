module "core" {
  source = "../_modules/core_infra"

  environment          = local.environment
  virtual_network_cidr = "10.51.0.0/16"
  nat_enabled          = false
  tags                 = local.tags
}
