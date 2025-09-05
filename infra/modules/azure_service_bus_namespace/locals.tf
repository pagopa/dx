locals {
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  name            = provider::dx::resource_name(merge(local.naming_config, { resource_type = "servicebus_namespace" }))
  autoscaler_name = replace(local.name, "sbns", "sbns-as")
  use_cases = {
    default = {
      sku_name        = "Premium"
      capacity        = 1
      partitions      = 1
      default_action  = "Allow" # Using "Deny" for Premium SKU breaks the provider validation
      private_enpoint = true
      autoscale       = true
    }
  }

  use_case_features = local.use_cases[var.use_case]

  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name == null ? var.resource_group_name : var.private_dns_zone_resource_group_name

  tags = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/package.json")).name, "unknown") })
}
