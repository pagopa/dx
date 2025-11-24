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

  use_cases = {
    default = {
      sku = "standard"
    }
    development = {
      sku = "developer"
    }
  }

  use_case_features = local.use_cases[var.use_case]

  private_dns_zone = {
    resource_group_name = var.private_dns_zone_resource_group_name == null ? var.virtual_network.resource_group_name : var.private_dns_zone_resource_group_name
  }

  appcs = {
    sku_name              = var.size != null ? var.size : local.use_case_features.sku
    private_endpoint_name = provider::pagopa-dx::resource_name(merge(local.naming_config, { resource_type = "app_configuration_private_endpoint" }))
  }
}
