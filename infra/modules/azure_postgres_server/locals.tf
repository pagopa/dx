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

  db = {
    name = provider::dx::resource_name(merge(local.naming_config, { resource_type = "postgresql" }))
  }

  use_cases = {
    default = {
      sku_name              = "GP_Standard_D2ds_v5"
      geo_redundant_backup  = true
      auto_grow             = true
      replica_metric_alerts = true
      high_availability     = true
    }
  }

  use_case_features = local.use_cases[var.use_case]

  replica = {
    create = var.create_replica == true
    name   = provider::dx::resource_name(merge(local.naming_config, { resource_type = "postgresql_replica" }))
  }

  # Backup
  # Geo redundant backup is not available in Italy North
  # ZoneRedundant HA is not available in West Europe
  geo_redundant_backup_enabled = local.use_case_features.geo_redundant_backup && lower(var.environment.location) != "italynorth"
  high_availability_enabled    = var.high_availability_override ? true : local.use_case_features.high_availability && lower(var.environment.location) != "westeurope"
  auto_grow_enabled            = local.use_case_features.auto_grow

  # Monitoring
  metric_alerts         = var.custom_metric_alerts != null ? var.custom_metric_alerts : var.default_metric_alerts
  replica_metric_alerts = local.use_case_features.replica_metric_alerts && local.replica.create ? local.metric_alerts : {}
}
