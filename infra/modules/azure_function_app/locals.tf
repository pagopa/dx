locals {
  subnet = {
    enable_service_endpoints = var.subnet_service_endpoints != null ? concat(
      var.subnet_service_endpoints.cosmos ? ["Microsoft.CosmosDB"] : [],
      var.subnet_service_endpoints.web ? ["Microsoft.Web"] : [],
      var.subnet_service_endpoints.storage ? ["Microsoft.Storage"] : [],
    ) : []
    name = "${module.naming_convention.prefix}-func-snet-${module.naming_convention.suffix}"
  }

  app_service_plan = {
    enable = var.app_service_plan_id == null
    name   = "${module.naming_convention.prefix}-asp-${module.naming_convention.suffix}"
  }

  function_app = {
    name                   = "${module.naming_convention.prefix}-func-${module.naming_convention.suffix}"
    sku_name               = local.sku_name_mapping[local.tier]
    zone_balancing_enabled = local.tier != "s" && local.tier != "xs"
    is_slot_enabled        = local.tier == "s" || local.tier == "xs" ? 0 : 1
    pep_sites              = "${module.naming_convention.prefix}-func-pep-${module.naming_convention.suffix}"
    pep_sites_staging      = "${module.naming_convention.prefix}-staging-func-pep-${module.naming_convention.suffix}"
    alert                  = "${module.naming_convention.prefix}-func-${module.naming_convention.suffix}] Health Check Failed"
    worker_process_count   = local.worker_process_count_mapping[local.tier]
  }

  function_app_slot = {
    name = "staging"
  }

  application_insights = {
    enable = var.application_insights_connection_string != null
  }

  storage_account = {
    replication_type = local.tier == "s" || local.tier == "xs" ? "LRS" : "ZRS"
    name             = lower(replace("${module.naming_convention.project}${replace(module.naming_convention.domain, "-", "")}${var.environment.app_name}stfn${module.naming_convention.suffix}", "-", ""))
    pep_blob_name    = "${module.naming_convention.prefix}-blob-pep-${module.naming_convention.suffix}"
    pep_file_name    = "${module.naming_convention.prefix}-file-pep-${module.naming_convention.suffix}"
    pep_queue_name   = "${module.naming_convention.prefix}-queue-pep-${module.naming_convention.suffix}"
    alert            = "[${replace("${module.naming_convention.project}${replace(module.naming_convention.domain, "-", "")}${var.environment.app_name}stfn${module.naming_convention.suffix}", "-", "")}] Low Availability"
  }

  private_dns_zone = {
    resource_group_name = var.private_dns_zone_resource_group_name == null ? var.virtual_network.resource_group_name : var.private_dns_zone_resource_group_name
  }
}
