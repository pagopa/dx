locals {
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  namespace = {
    name = provider::dx::resource_name(merge(local.naming_config, { reosurce_type = "servicebus_namespace" }))
    sku_name = lookup(
      {
        "s" = "Standard",
        "m" = "Standard",
        "l" = "Premium"
      },
      var.tier,
      "Premium" # Default
    )
    partitions = local.namespace.sku_name == "Premium" ? 1 : 0
  }

  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name == null ? var.resource_group_name : var.private_dns_zone_resource_group_name

  tags = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/package.json")).name, "unknown") })
}
