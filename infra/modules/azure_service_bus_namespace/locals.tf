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

  sku_name = lookup(
    {
      "m" = "Standard",
      "l" = "Premium"
    },
    var.tier,
    "Premium"
  )

  capacity       = local.sku_name == "Premium" ? 1 : 0
  partitions     = local.sku_name == "Premium" ? 1 : 0
  default_action = local.sku_name == "Premium" ? "Allow" : "Deny" # Using "Deny" for Premium SKU breaks the provider validation

  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name == null ? var.resource_group_name : var.private_dns_zone_resource_group_name

  tags = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/package.json")).name, "unknown") })
}
