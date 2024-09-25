locals {
  location_short  = var.environment.location == "italynorth" ? "itn" : var.environment.location == "westeurope" ? "weu" : var.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project         = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
  domain          = var.environment.domain == null ? "-" : "-${var.environment.domain}-"
  app_name_prefix = "${local.project}${local.domain}${var.environment.app_name}"

  # For backwards compatibility
  # If no legacy value is passed, use the original value
  # TO DO: Remove this in the next major release and replace all local.tier with var.tier
  tier = var.tier == "test" ? "s" : var.tier == "standard" ? "m" : var.tier == "premium" ? "l" : var.tier

  subnet = {
    enable_service_endpoints = var.subnet_service_endpoints != null ? concat(
      var.subnet_service_endpoints.cosmos ? ["Microsoft.CosmosDB"] : [],
      var.subnet_service_endpoints.web ? ["Microsoft.Web"] : [],
      var.subnet_service_endpoints.storage ? ["Microsoft.Storage"] : [],
    ) : []
    name = "${local.app_name_prefix}-func-snet-${var.environment.instance_number}"
  }

  app_service_plan = {
    enable = var.app_service_plan_id == null
    name   = "${local.app_name_prefix}-asp-${var.environment.instance_number}"
  }

  function_app = {
    name                   = "${local.app_name_prefix}-func-${var.environment.instance_number}"
    sku_name               = local.tier == "s" ? "B1" : local.tier == "m" ? "P0v3" : local.tier == "l" ? "P1v3" : local.tier == "xl" ? "P2mv3" : "B1"
    zone_balancing_enabled = local.tier != "s"
    is_slot_enabled        = local.tier == "s" ? 0 : 1
    pep_sites              = "${local.app_name_prefix}-func-pep-${var.environment.instance_number}"
    pep_sites_staging      = "${local.app_name_prefix}-staging-func-pep-${var.environment.instance_number}"
    alert                  = "${local.app_name_prefix}-func-${var.environment.instance_number}] Health Check Failed"
    worker_process_count   = local.tier == "s" ? "2" : local.tier == "m" ? "4" : local.tier == "l" ? "8" : local.tier == "xl" ? "8" : "2"
  }

  function_app_slot = {
    name = "staging"
  }

  application_insights = {
    enable = var.application_insights_connection_string != null
  }

  storage_account = {
    replication_type = local.tier == "s" ? "LRS" : "ZRS"
    name             = replace("${local.project}${replace(local.domain, "-", "")}${var.environment.app_name}stfn${var.environment.instance_number}", "-", "")
    pep_blob_name    = "${local.app_name_prefix}-blob-pep-${var.environment.instance_number}"
    pep_file_name    = "${local.app_name_prefix}-file-pep-${var.environment.instance_number}"
    pep_queue_name   = "${local.app_name_prefix}-queue-pep-${var.environment.instance_number}"
    alert            = "[${replace("${local.project}${replace(local.domain, "-", "")}${var.environment.app_name}stfn${var.environment.instance_number}", "-", "")}] Low Availability"
  }

  private_dns_zone = {
    resource_group_name = var.private_dns_zone_resource_group_name == null ? var.virtual_network.resource_group_name : var.private_dns_zone_resource_group_name
  }
}
