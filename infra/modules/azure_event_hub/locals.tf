locals {
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }
  eventhub = {
    name = provider::dx::resource_name(merge(local.naming_config, { resource_type = "eventhub_namespace" }))
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
      hub  = replace(local.eventhub.name, "${var.environment.app_name}-evhns", h.name)
      name = c
  }]]) : "${hc.hub}.${hc.name}" => hc }

  keys = { for hk in flatten([for h in var.eventhubs :
    [for k in h.keys : {
      hub = replace(local.eventhub.name, "${var.environment.app_name}-evhns", h.name)
      key = k
  }]]) : "${hk.hub}.${hk.key.name}" => hk }

  hubs = { for h in var.eventhubs : replace(local.eventhub.name, "${var.environment.app_name}-evhns", h.name) => h }

  # Network
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name == null ? var.resource_group_name : var.private_dns_zone_resource_group_name

  # Autoscaling
  auto_inflate_enabled     = var.tier == "l" ? true : false
  maximum_throughput_units = local.auto_inflate_enabled ? 15 : null
  capacity                 = var.tier == "m" ? 1 : var.tier == "l" ? 2 : null
}
