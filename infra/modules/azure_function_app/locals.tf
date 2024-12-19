locals {
  subnet = {
    enable_service_endpoints = var.subnet_service_endpoints != null ? concat(
      var.subnet_service_endpoints.cosmos ? ["Microsoft.CosmosDB"] : [],
      var.subnet_service_endpoints.web ? ["Microsoft.Web"] : [],
      var.subnet_service_endpoints.storage ? ["Microsoft.Storage"] : [],
    ) : []
    name = module.naming_convention.name.function_subnet["1"]
  }

  app_service_plan = {
    enable = var.app_service_plan_id == null
    name   = module.naming_convention.name.app_service_plan["1"]
  }

  function_app = {
    name                   = module.naming_convention.name.function_app["1"]
    sku_name               = local.sku_name_mapping[local.tier]
    zone_balancing_enabled = local.tier != "s"
    is_slot_enabled        = local.tier == "s" ? 0 : 1
    pep_sites              = module.naming_convention.name.function_private_endpoint["1"]
    pep_sites_staging      = module.naming_convention.name.function_slot_private_endpoint["1"]
    alert                  = "[${module.naming_convention.name.function_app["1"]}] Health Check Failed"
    worker_process_count   = local.worker_process_count_mapping[local.tier]
  }

  function_app_slot = {
    name = "staging"
  }

  application_insights = {
    enable = var.application_insights_connection_string != null
  }

  storage_account = {
    replication_type = local.tier == "s" ? "LRS" : "ZRS"
    name             = module.naming_convention.name.function_storage_account["1"]
    pep_blob_name    = module.naming_convention.name.blob_private_endpoint["1"]
    pep_file_name    = module.naming_convention.name.file_private_endpoint["1"]
    pep_queue_name   = module.naming_convention.name.queue_private_endpoint["1"]
    alert            = "[${module.naming_convention.name.function_storage_account["1"]}] Low Availability"
  }

  private_dns_zone = {
    resource_group_name = var.private_dns_zone_resource_group_name == null ? var.virtual_network.resource_group_name : var.private_dns_zone_resource_group_name
  }
}
