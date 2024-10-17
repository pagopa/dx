locals {
  eventhub = {
    name = "${module.naming_convention.prefix}-evhns-${module.naming_convention.suffix}"
    sku_name = lookup(
      {
        "s" = "Standard",
        "m" = "Standard",
        "l" = "Premium"
      },
      var.tier,
      "Premium" # Default
    )
    # Note: Basic SKU does not support private access
  }

  # Events configuration
  consumers = { for hc in flatten([for h in var.eventhubs :
    [for c in h.consumers : {
      hub  = "${module.naming_convention.prefix}-${h.name}-${module.naming_convention.suffix}"
      name = c
  }]]) : "${hc.hub}.${hc.name}" => hc }

  keys = { for hk in flatten([for h in var.eventhubs :
    [for k in h.keys : {
      hub = "${module.naming_convention.prefix}-${h.name}-${module.naming_convention.suffix}"
      key = k
  }]]) : "${hk.hub}.${hk.key.name}" => hk }

  hubs = { for h in var.eventhubs : "${module.naming_convention.prefix}-${h.name}-${module.naming_convention.suffix}" => h }

  # Network
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name == null ? var.resource_group_name : var.private_dns_zone_resource_group_name

  # Autoscaling
  auto_inflate_enabled     = var.tier == "l" ? true : false
  maximum_throughput_units = local.auto_inflate_enabled ? 15 : null
  capacity                 = var.tier == "m" ? 1 : var.tier == "l" ? 2 : null
}
