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
  eventhub = {
    name = provider::dx::resource_name(merge(local.naming_config, { resource_type = "eventhub_namespace" }))
  }

  use_cases = {
    default = {
      sku_name             = "Standard"
      capacity             = 1
      auto_inflate_enabled = false
      alerts               = true
    }
  }

  use_case_features = local.use_cases[var.use_case]

  # Events configuration
  consumers = { for hc in flatten([for h in var.eventhubs :
    [for c in h.consumers : {
      hub  = replace(local.eventhub.name, "${var.environment.app_name}-evhns", h.name)
      name = c
  }]]) : "${hc.hub}.${hc.name}" => hc }

  keys = { for hk in flatten([for h in var.eventhubs :
    [for k in h.keys : {
      hub = replace(local.eventhub.name, "-evhns-", "-${h.name}-")
      key = k
  }]]) : "${hk.hub}.${hk.key.name}" => hk }

  hubs = { for h in var.eventhubs : replace(local.eventhub.name, "-evhns-", "-${h.name}-") => h }

  # Network
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name == null ? var.resource_group_name : var.private_dns_zone_resource_group_name

  # Autoscaling
  maximum_throughput_units = local.use_case_features.auto_inflate_enabled ? 15 : null
}
