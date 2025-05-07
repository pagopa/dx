locals {
  tags = merge(var.tags, { module_version = try(jsondecode(file("${path.module}/package.json")).version, "unknown") })
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  subnet = {
    enable_service_endpoints = var.subnet_service_endpoints != null ? concat(
      var.subnet_service_endpoints.cosmos ? ["Microsoft.CosmosDB"] : [],
      var.subnet_service_endpoints.web ? ["Microsoft.Web"] : [],
      var.subnet_service_endpoints.storage ? ["Microsoft.Storage"] : [],
    ) : []
    name = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_subnet" }))
  }

  app_service_plan = {
    enable = var.app_service_plan_id == null
    name   = provider::dx::resource_name(merge(local.naming_config, { resource_type = "app_service_plan" }))
  }

  function_app = {
    name                   = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_app" }))
    sku_name               = local.sku_name_mapping[local.tier]
    zone_balancing_enabled = local.tier != "s"
    is_slot_enabled        = local.tier == "s" ? 0 : 1
    has_existing_subnet    = var.subnet_id != null
    pep_sites              = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_private_endpoint" }))
    pep_sites_staging      = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_slot_private_endpoint" }))
    alert                  = "${provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_app" }))}] Health Check Failed"
    worker_process_count   = local.worker_process_count_mapping[local.tier]
    has_durable            = var.has_durable_functions ? 1 : 0
  }

  function_app_slot = {
    name = "staging"
  }

  application_insights = {
    enable = nonsensitive(var.application_insights_connection_string != null)
  }

  storage_account = {
    replication_type = local.tier == "s" ? "LRS" : "ZRS"
    name             = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_storage_account" }))
    durable_name     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "durable_function_storage_account" }))
    pep_blob_name    = provider::dx::resource_name(merge(local.naming_config, { resource_type = "blob_private_endpoint" }))
    pep_file_name    = provider::dx::resource_name(merge(local.naming_config, { resource_type = "file_private_endpoint" }))
    pep_queue_name   = provider::dx::resource_name(merge(local.naming_config, { resource_type = "queue_private_endpoint" }))
    pep_dblob_name   = replace(provider::dx::resource_name(merge(local.naming_config, { resource_type = "blob_private_endpoint" })), "blob-pep", "dblob-pep")
    pep_dfile_name   = replace(provider::dx::resource_name(merge(local.naming_config, { resource_type = "file_private_endpoint" })), "file-pep", "dfile-pep")
    pep_dqueue_name  = replace(provider::dx::resource_name(merge(local.naming_config, { resource_type = "queue_private_endpoint" })), "queue-pep", "dqueue-pep")
    pep_dtable_name  = replace(provider::dx::resource_name(merge(local.naming_config, { resource_type = "table_private_endpoint" })), "table-pep", "dtable-pep")
    alert            = "[${provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_storage_account" }))}] Low Availability"
  }

  private_dns_zone = {
    resource_group_name = var.private_dns_zone_resource_group_name == null ? var.virtual_network.resource_group_name : var.private_dns_zone_resource_group_name
  }
}
