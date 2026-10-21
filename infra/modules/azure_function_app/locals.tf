locals {
  tags = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/module.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/project.json")).name, "unknown") })
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

  use_cases = {
    default = {
      sku              = "P1v3"
      zone_balancing   = true
      slot             = true
      replication_type = "ZRS"
      alerts           = true
    }
    high_load = {
      sku              = "P2mv3"
      zone_balancing   = true
      slot             = true
      replication_type = "ZRS"
      alerts           = true
    }
  }

  use_case_features = local.use_cases[var.use_case]

  worker_process_count = local.worker_process_count_map[local.function_app.sku_name]

  app_service_plan = {
    enable = var.app_service_plan_id == null
    name   = provider::dx::resource_name(merge(local.naming_config, { resource_type = "app_service_plan" }))
  }

  function_app = {
    name                = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_app" }))
    sku_name            = var.size != null ? var.size : local.use_case_features.sku
    has_existing_subnet = var.subnet_id != null
    pep_sites           = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_private_endpoint" }))
    pep_sites_staging   = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_slot_private_endpoint" }))
    alert               = "[${provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_app" }))}] Health Check Failed"
    has_durable         = var.has_durable_functions ? 1 : 0
  }

  function_app_slot = {
    name = "staging"
  }

  container_image_parts        = var.container_image == null ? [] : split("/", var.container_image)
  container_image_has_registry = length(local.container_image_parts) > 1 && can(regex("[.:]|^localhost$", try(local.container_image_parts[0], "")))
  container_image_repository   = local.container_image_has_registry ? join("/", slice(local.container_image_parts, 1, length(local.container_image_parts))) : var.container_image

  container = {
    enable               = var.container_image != null
    use_managed_identity = var.use_acr_managed_identity
    registry_url         = var.container_image == null ? null : "https://${local.container_image_has_registry ? local.container_image_parts[0] : "index.docker.io"}"
    image_name           = var.container_image == null ? null : regex("^(.+):[^:]+$", local.container_image_repository)[0]
    image_tag            = var.container_image == null ? null : regex(":([^:]+)$", local.container_image_repository)[0]
  }

  # Container-based apps run the image content, so the deployment package setting must not be set
  package_app_settings = local.container.enable ? {
    # https://learn.microsoft.com/en-us/troubleshoot/azure/app-service/faqs-app-service-linux-new#custom-containers
    WEBSITES_ENABLE_APP_SERVICE_STORAGE = "false"
    } : {
    # https://learn.microsoft.com/en-us/azure/azure-functions/run-functions-from-deployment-package#using-website_run_from_package--1
    WEBSITE_RUN_FROM_PACKAGE = 1
  }

  application_insights = {
    enable = nonsensitive(var.application_insights_connection_string != null)
  }

  storage_account = {
    name            = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_storage_account" }))
    durable_name    = provider::dx::resource_name(merge(local.naming_config, { resource_type = "durable_function_storage_account" }))
    pep_blob_name   = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_blob_private_endpoint" }))
    pep_file_name   = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_file_private_endpoint" }))
    pep_queue_name  = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_queue_private_endpoint" }))
    pep_dblob_name  = provider::dx::resource_name(merge(local.naming_config, { resource_type = "dfunction_blob_private_endpoint" }))
    pep_dfile_name  = provider::dx::resource_name(merge(local.naming_config, { resource_type = "dfunction_file_private_endpoint" }))
    pep_dqueue_name = provider::dx::resource_name(merge(local.naming_config, { resource_type = "dfunction_queue_private_endpoint" }))
    pep_dtable_name = provider::dx::resource_name(merge(local.naming_config, { resource_type = "dfunction_table_private_endpoint" }))
    alert           = "[${provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_storage_account" }))}] Low Availability"
  }

  private_dns_zone = {
    resource_group_name = var.private_dns_zone_resource_group_name == null ? var.virtual_network.resource_group_name : var.private_dns_zone_resource_group_name
  }

  private_dns_zone_ids = {
    blob          = var.private_dns_zone_ids != null && var.private_dns_zone_ids.blob != null ? var.private_dns_zone_ids.blob : data.azurerm_private_dns_zone.storage_account_blob[0].id
    file          = var.private_dns_zone_ids != null && var.private_dns_zone_ids.file != null ? var.private_dns_zone_ids.file : data.azurerm_private_dns_zone.storage_account_file[0].id
    queue         = var.private_dns_zone_ids != null && var.private_dns_zone_ids.queue != null ? var.private_dns_zone_ids.queue : data.azurerm_private_dns_zone.storage_account_queue[0].id
    table         = var.private_dns_zone_ids != null && var.private_dns_zone_ids.table != null ? var.private_dns_zone_ids.table : (local.function_app.has_durable == 1 ? data.azurerm_private_dns_zone.storage_account_table[0].id : null)
    azurewebsites = var.private_dns_zone_ids != null && var.private_dns_zone_ids.azurewebsites != null ? var.private_dns_zone_ids.azurewebsites : data.azurerm_private_dns_zone.function_app[0].id
  }
}
