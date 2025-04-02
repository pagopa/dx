locals {
  naming_config = {
    prefix      = var.environment.prefix,
    environment = var.environment.env_short,
    location = tomap({
      "italynorth" = "itn",
      "westeurope" = "weu"
    })[var.environment.location]
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  db = {
    name         = provider::dx::resource_name(merge(local.naming_config, { resource_type = "postgresql" }))
    replica_name = var.tier == "l" ? provider::dx::resource_name(merge(local.naming_config, { resource_type = "postgresql_replica" })) : null
    sku_name = lookup(
      {
        "s" = "B_Standard_B1ms",
        "m" = "GP_Standard_D2ds_v5",
        "l" = "GP_Standard_D4ds_v5"
      },
      var.tier,
      "GP_Standard_D2ds_v5" # Default
    )
  }

  # Backup
  # Geo redundant backup is not available in Italy North
  # ZoneRedundant HA is not available in West Europe
  geo_redundant_backup_enabled = (var.tier == "m" || var.tier == "l") && lower(var.environment.location) != "italynorth"
  high_availability_enabled    = var.high_availability_override ? true : (var.tier == "m" || var.tier == "l") && lower(var.environment.location) != "westeurope"
  auto_grow_enabled            = var.tier == "m" || var.tier == "l"

  # Monitoring
  metric_alerts         = var.custom_metric_alerts != null ? var.custom_metric_alerts : var.default_metric_alerts
  replica_metric_alerts = var.tier == "l" ? local.metric_alerts : {}
}
