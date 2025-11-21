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

  use_cases = {
    default = {
      cpu    = 1.25
      memory = "2.5Gi"
      alerts = false
      replicas = {
        min = 1
        max = 8
      }
    }
    function_app = {
      cpu                  = 1.25
      memory               = "2.5Gi"
      alerts               = true
      worker_process_count = "2"
      replicas = {
        min = 3
        max = 50
      }
    }
  }

  use_case_features = local.use_cases[var.use_case]

  cpu_size    = var.size != null ? var.size.cpu : local.use_case_features.cpu
  memory_size = var.size != null ? var.size.memory : local.use_case_features.memory

  replica_minimum = try(var.autoscaler.replicas.minimum, local.use_case_features.replicas.min)
  replica_maximum = try(var.autoscaler.replicas.maximum, local.use_case_features.replicas.max)

  is_function_app = nonsensitive(var.function_settings != null)

  cae_id            = local.is_function_app ? provider::azurerm::parse_resource_id(var.container_app_environment_id) : null
  subscription_id   = local.is_function_app ? local.cae_id["subscription_id"] : null
  resource_group_id = local.is_function_app ? provider::azurerm::normalise_resource_id("/subscriptions/${local.subscription_id}/resourceGroups/${var.resource_group_name}") : null

  application_insights = {
    enable = nonsensitive(local.is_function_app ? (var.function_settings.application_insights_connection_string != null) : false)
  }

  function_app = {
    has_durable = local.is_function_app ? (var.function_settings.has_durable_functions ? 1 : 0) : 0
    name        = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_app" }))
  }

  storage_account = {
    replication_type = "ZRS"
    name             = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_storage_account" }))
    durable_name     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "durable_function_storage_account" }))
    pep_blob_name    = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_blob_private_endpoint" }))
    pep_file_name    = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_file_private_endpoint" }))
    pep_queue_name   = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_queue_private_endpoint" }))
    pep_dblob_name   = provider::dx::resource_name(merge(local.naming_config, { resource_type = "dfunction_blob_private_endpoint" }))
    pep_dfile_name   = provider::dx::resource_name(merge(local.naming_config, { resource_type = "dfunction_file_private_endpoint" }))
    pep_dqueue_name  = provider::dx::resource_name(merge(local.naming_config, { resource_type = "dfunction_queue_private_endpoint" }))
    pep_dtable_name  = provider::dx::resource_name(merge(local.naming_config, { resource_type = "dfunction_table_private_endpoint" }))
    alert            = "[${provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_storage_account" }))}] Low Availability"

    blob_private_dns_zone_id  = local.is_function_app ? "${var.function_settings.private_dns_zone_resource_group_id}/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net" : null
    file_private_dns_zone_id  = local.is_function_app ? "${var.function_settings.private_dns_zone_resource_group_id}/providers/Microsoft.Network/privateDnsZones/privatelink.file.core.windows.net" : null
    queue_private_dns_zone_id = local.is_function_app ? "${var.function_settings.private_dns_zone_resource_group_id}/providers/Microsoft.Network/privateDnsZones/privatelink.queue.core.windows.net" : null
    table_private_dns_zone_id = local.is_function_app ? "${var.function_settings.private_dns_zone_resource_group_id}/providers/Microsoft.Network/privateDnsZones/privatelink.table.core.windows.net" : null
  }
}
