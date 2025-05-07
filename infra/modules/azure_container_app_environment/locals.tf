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

  has_existing_subnet = var.subnet_id != null
}
