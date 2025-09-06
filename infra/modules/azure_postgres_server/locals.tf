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
    sku_name = lookup(
      {
        "default" = "GP_Standard_D2ds_v5",
      },
      var.use_case,
      "GP_Standard_D2ds_v5"
    )
  }

  replica = {
    create = var.create_replica == true
    name   = provider::dx::resource_name(merge(local.naming_config, { resource_type = "postgresql_replica" }))
  }

  # Backup
  # Geo redundant backup is not available in Italy North
  # ZoneRedundant HA is not available in West Europe
  geo_redundant_backup_enabled = (var.use_case == "default") && lower(var.environment.location) != "italynorth"
  high_availability_enabled    = var.high_availability_override ? true : (var.use_case == "default") && lower(var.environment.location) != "westeurope"
  auto_grow_enabled            = var.use_case == "default"

  # Monitoring
  metric_alerts         = var.custom_metric_alerts != null ? var.custom_metric_alerts : var.default_metric_alerts
  replica_metric_alerts = var.use_case == "default" && local.replica.create ? local.metric_alerts : {}
}
