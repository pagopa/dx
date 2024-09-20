locals {
  # General
  location_short  = var.environment.location == "italynorth" ? "itn" : var.environment.location == "westeurope" ? "weu" : var.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project         = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
  domain          = var.environment.domain == null ? "-" : "-${var.environment.domain}-"
  app_name_prefix = "${local.project}${local.domain}${var.environment.app_name}"

  eventhub = {
    name     = "${local.app_name_prefix}-evhns-${var.environment.instance_number}"
    sku_name = var.tier == "test" ? "Basic" : var.tier == "standard" ? "Standard" : "Premium"
    # Note: Basic SKU does not support private access
  }

  # Events configuration
  consumers = { for hc in flatten([for h in var.eventhubs :
    [for c in h.consumers : {
      hub  = h.name
      name = c
  }]]) : "${hc.hub}.${hc.name}" => hc }

  keys = { for hk in flatten([for h in var.eventhubs :
    [for k in h.keys : {
      hub = h.name
      key = k
  }]]) : "${hk.hub}.${hk.key.name}" => hk }

  hubs = { for h in var.eventhubs : h.name => h }

  # Network
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name == null ? var.resource_group_name : var.private_dns_zone_resource_group_name

  # Autoscaling
  auto_inflate_enabled     = var.tier == "premium" ? true : false
  maximum_throughput_units = local.auto_inflate_enabled ? 15 : null
  capacity                 = var.tier == "standard" ? 1 : var.tier == "premium" ? 2 : null
}
