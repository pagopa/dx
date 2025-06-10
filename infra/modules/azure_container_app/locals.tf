locals {
  tags = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/package.json")).name, "unknown") })
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }
  sku_mapping = {
    "xs" = {
      cpu    = 0.25
      memory = "0.5Gi"
    }
    "s" = {
      cpu    = 0.5
      memory = "1Gi"
    }
    "m" = {
      cpu    = 1.25
      memory = "2.5Gi"
    }
    "l" = {
      cpu    = 2
      memory = "4Gi"
    }
  }

  sku = lookup(local.sku_mapping, var.tier, null)
}
