locals {
  tags = merge(var.tags, { DXModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"), DXModuleName = try(jsondecode(file("${path.module}/package.json")).name) })
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  sku_name               = local.sku_name_mapping[var.tier]
  zone_balancing_enabled = var.tier != "s"

  sku_name_mapping = {
    s  = "B1"
    m  = "P0v3"
    l  = "P1v3"
    xl = "P2v3"
  }
}
