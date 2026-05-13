terraform {
  required_version = ">= 1.13.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
  storage_use_azuread = true
}

locals {
  location             = "italynorth"
  function_subnet_cidr = cidrsubnet(data.azurerm_virtual_network.this.address_space[0], 8, 250)

  names = {
    function_subnet    = "dx-d-itn-platform-poc-func-snet-01"
    service_plan       = "dx-d-itn-platform-poc-asp-01"
    storage            = "mystorage12345"
    function_app       = "wrongname"
    function_slot      = "staging"
    pep_sites          = "dx-d-itn-platform-poc-func-pep-01"
    pep_sites_staging  = "dx-d-itn-platform-poc-staging-func-pep-01"
    pep_blob           = "dx-d-itn-platform-poc-func-blob-pep-01"
    pep_file           = "dx-d-itn-platform-poc-func-file-pep-01"
    pep_queue          = "dx-d-itn-platform-poc-func-queue-pep-01"
    function_app_alert = "[wrongname] Health Check Failed"
    storage_alert      = "[mystorage12345] Low Availability"
    ghost_storage      = "ghoststorage12345"
  }

  tags = {
    CostCenter     = "TS700 - ENGINEERING"
    Environment    = "dev"
    BusinessUnit   = "DevEx"
    ManagementTeam = "Developer Experience"
    Source         = "https://github.com/pagopa/dx/tree/main/opa-poc/terraform/non-compliant"
  }

  function_app_settings = {
    WEBSITE_ADD_SITENAME_BINDINGS_IN_APPHOST_CONFIG = "1"
    WEBSITE_RUN_FROM_PACKAGE                        = "1"
    WEBSITE_DNS_SERVER                              = "168.63.129.16"
    SLOT_TASK_HUBNAME                               = "BrokenTaskHub"
    FUNCTIONS_WORKER_PROCESS_COUNT                  = "2"
    WEBSITE_SWAP_WARMUP_PING_PATH                   = "/health"
    WEBSITE_SWAP_WARMUP_PING_STATUSES               = "200,204"
    WEBSITE_WARMUP_PATH                             = "/health"
  }
}

data "azurerm_virtual_network" "this" {
  name                = "dx-d-itn-common-vnet-01"
  resource_group_name = "dx-d-itn-network-rg-01"
}

data "azurerm_subnet" "pep" {
  name                 = "dx-d-itn-pep-snet-01"
  virtual_network_name = data.azurerm_virtual_network.this.name
  resource_group_name  = data.azurerm_virtual_network.this.resource_group_name
}

data "azurerm_resource_group" "this" {
  name = "dx-d-itn-common-rg-01"
}

data "azurerm_private_dns_zone" "function_app" {
  name                = "privatelink.azurewebsites.net"
  resource_group_name = data.azurerm_virtual_network.this.resource_group_name
}

data "azurerm_private_dns_zone" "storage_account_blob" {
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = data.azurerm_virtual_network.this.resource_group_name
}

data "azurerm_private_dns_zone" "storage_account_file" {
  name                = "privatelink.file.core.windows.net"
  resource_group_name = data.azurerm_virtual_network.this.resource_group_name
}

data "azurerm_private_dns_zone" "storage_account_queue" {
  name                = "privatelink.queue.core.windows.net"
  resource_group_name = data.azurerm_virtual_network.this.resource_group_name
}

data "azurerm_client_config" "current" {}

resource "azurerm_subnet" "func" {
  name                 = local.names.function_subnet
  virtual_network_name = data.azurerm_virtual_network.this.name
  resource_group_name  = data.azurerm_virtual_network.this.resource_group_name
  address_prefixes     = [local.function_subnet_cidr]

  delegation {
    name = "default"
    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

resource "azurerm_service_plan" "this" {
  name                   = local.names.service_plan
  location               = local.location
  resource_group_name    = data.azurerm_resource_group.this.name
  os_type                = "Linux"
  sku_name               = "P1v3"
  zone_balancing_enabled = true

  tags = local.tags
}

resource "azurerm_storage_account" "func" {
  name                = local.names.storage
  location            = local.location
  resource_group_name = data.azurerm_resource_group.this.name

  account_tier                     = "Standard"
  account_kind                     = "BlobStorage"
  account_replication_type         = "LRS"
  min_tls_version                  = "TLS1_0"
  https_traffic_only_enabled       = false
  cross_tenant_replication_enabled = true
  public_network_access_enabled    = false

  tags = local.tags
}

resource "azurerm_private_endpoint" "st_blob" {
  name                = local.names.pep_blob
  location            = local.location
  resource_group_name = data.azurerm_resource_group.this.name
  subnet_id           = data.azurerm_subnet.pep.id

  private_service_connection {
    name                           = local.names.pep_blob
    private_connection_resource_id = azurerm_linux_function_app.this.id
    is_manual_connection           = false
    subresource_names              = ["sites"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.storage_account_blob.id]
  }

  tags = local.tags
}

resource "azurerm_private_endpoint" "st_file" {
  name                = local.names.pep_file
  location            = local.location
  resource_group_name = data.azurerm_resource_group.this.name
  subnet_id           = data.azurerm_subnet.pep.id

  private_service_connection {
    name                           = local.names.pep_file
    private_connection_resource_id = azurerm_linux_function_app.this.id
    is_manual_connection           = false
    subresource_names              = ["sites"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.storage_account_file.id]
  }

  tags = local.tags
}

resource "azurerm_private_endpoint" "st_queue" {
  name                = local.names.pep_queue
  location            = local.location
  resource_group_name = data.azurerm_resource_group.this.name
  subnet_id           = data.azurerm_subnet.pep.id

  private_service_connection {
    name                           = local.names.pep_queue
    private_connection_resource_id = azurerm_linux_function_app.this.id
    is_manual_connection           = false
    subresource_names              = ["sites"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.storage_account_queue.id]
  }

  tags = local.tags
}

resource "azurerm_linux_function_app" "this" {
  name                = local.names.function_app
  location            = local.location
  resource_group_name = data.azurerm_resource_group.this.name

  service_plan_id = azurerm_service_plan.this.id

  storage_account_name          = local.names.ghost_storage
  storage_account_access_key    = azurerm_storage_account.func.primary_access_key
  storage_uses_managed_identity = false
  builtin_logging_enabled       = true

  https_only                    = false
  public_network_access_enabled = true

  site_config {
    http2_enabled                     = true
    always_on                         = false
    health_check_path                 = "/health"
    health_check_eviction_time_in_min = 2
    ip_restriction_default_action     = "Allow"
    minimum_tls_version               = "1.0"

    application_stack {
      node_version = "22"
    }
  }

  app_settings = local.function_app_settings

  tags = local.tags
}

resource "azurerm_storage_account_network_rules" "st_network_rules" {
  storage_account_id = azurerm_storage_account.func.id
  default_action     = "Deny"
  bypass             = ["Metrics", "Logging", "AzureServices"]

  depends_on = [azurerm_linux_function_app.this]
}

resource "azurerm_linux_function_app_slot" "this" {
  name            = local.names.function_slot
  function_app_id = azurerm_linux_function_app.this.id

  storage_account_name          = local.names.ghost_storage
  storage_account_access_key    = azurerm_storage_account.func.primary_access_key
  storage_uses_managed_identity = false
  builtin_logging_enabled       = true

  https_only                    = false
  public_network_access_enabled = true

  site_config {
    http2_enabled                     = true
    always_on                         = false
    health_check_path                 = "/health"
    health_check_eviction_time_in_min = 2
    ip_restriction_default_action     = "Allow"
    minimum_tls_version               = "1.0"

    application_stack {
      node_version = "22"
    }
  }

  app_settings = local.function_app_settings

  tags = local.tags
}

resource "azurerm_private_endpoint" "function_sites" {
  name                = local.names.pep_sites
  location            = local.location
  resource_group_name = data.azurerm_resource_group.this.name
  subnet_id           = data.azurerm_subnet.pep.id

  private_service_connection {
    name                           = local.names.pep_sites
    private_connection_resource_id = azurerm_linux_function_app.this.id
    is_manual_connection           = false
    subresource_names              = ["sites"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.function_app.id]
  }

  tags = local.tags
}

resource "azurerm_private_endpoint" "staging_function_sites" {
  name                = local.names.pep_sites_staging
  location            = local.location
  resource_group_name = data.azurerm_resource_group.this.name
  subnet_id           = data.azurerm_subnet.pep.id

  private_service_connection {
    name                           = local.names.pep_sites_staging
    private_connection_resource_id = azurerm_linux_function_app.this.id
    is_manual_connection           = false
    subresource_names              = ["sites-${azurerm_linux_function_app_slot.this.name}"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.function_app.id]
  }

  tags = local.tags
}

resource "azurerm_role_assignment" "function_storage_blob_data_owner" {
  scope                = azurerm_storage_account.func.id
  role_definition_name = "Storage Blob Data Owner"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "staging_function_storage_blob_data_owner" {
  scope                = azurerm_storage_account.func.id
  role_definition_name = "Storage Blob Data Owner"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "function_storage_account_contributor" {
  scope                = azurerm_storage_account.func.id
  role_definition_name = "Storage Account Contributor"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "staging_function_storage_account_contributor" {
  scope                = azurerm_storage_account.func.id
  role_definition_name = "Storage Account Contributor"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "function_storage_queue_data_contributor" {
  scope                = azurerm_storage_account.func.id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "staging_function_storage_queue_data_contributor" {
  scope                = azurerm_storage_account.func.id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_monitor_metric_alert" "function_app_health_check" {
  name                = local.names.function_app_alert
  resource_group_name = data.azurerm_resource_group.this.name
  scopes              = [azurerm_linux_function_app.this.id]
  description         = "Function availability is under threshold level. Runbook: -"
  severity            = 1
  frequency           = "PT5M"
  auto_mitigate       = false
  enabled             = true

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "HealthCheckStatus"
    aggregation      = "Average"
    operator         = "LessThan"
    threshold        = 50
  }

  tags = local.tags
}

resource "azurerm_monitor_metric_alert" "storage_account_health_check" {
  name                = local.names.storage_alert
  resource_group_name = data.azurerm_resource_group.this.name
  scopes              = [azurerm_storage_account.func.id]
  description         = "The average availability is less than 99.8%. Runbook: not needed."
  severity            = 0
  window_size         = "PT5M"
  frequency           = "PT5M"
  auto_mitigate       = false

  criteria {
    metric_namespace       = "Microsoft.Storage/storageAccounts"
    metric_name            = "Availability"
    aggregation            = "Average"
    operator               = "LessThan"
    threshold              = 99.8
    skip_metric_validation = false
  }

  tags = local.tags
}
