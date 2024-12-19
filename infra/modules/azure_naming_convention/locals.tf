locals {
  # General
  location_map = {
    "italynorth"         = "itn",
    "westeurope"         = "weu",
    "germanywestcentral" = "gwc"
    "spaincentral"       = "spc"
  }

  configurations = {
    for env in var.environments : join("", [
      "${env.prefix}-${env.env_short}-${lookup(local.location_map, env.location, "neu")}",
      env.domain == null ? "-" : "-${env.domain}-",
      env.app_name
      ]) => {
      prefix          = env.prefix
      env_short       = env.env_short
      location        = env.location
      domain          = env.domain
      app_name        = env.app_name
      instance_number = env.instance_number
      project         = "${env.prefix}-${env.env_short}-${lookup(local.location_map, env.location, "neu")}"
      app_suffix      = [for i in range(env.instance_number) : format("%02d", i + 1)]
    }
  }

  # Map resource types to their abbreviations
  # Ref.: https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-abbreviations
  resource_abbreviations = {
    # Compute
    "virtual_machine" = "vm"

    # Storage
    "storage_account"        = "st"
    "blob_storage"           = "blob"
    "queue_storage"          = "queue"
    "table_storage"          = "table"
    "file_storage"           = "file"
    function_storage_account = "stfn"

    # Networking
    "dns_zone"               = "dns"
    "api_management"         = "apim"
    "virtual_network"        = "vnet"
    "network_security_group" = "nsg"
    "app_gateway"            = "agw"

    # Private Endpoints
    "cosmos_private_endpoint"          = "cosno-pep"
    "postgre_private_endpoint"         = "psql-pep"
    "postgre_replica_private_endpoint" = "psql-pep-replica"
    "app_private_endpoint"             = "app-pep"
    "app_slot_private_endpoint"        = "staging-app-pep"
    "function_private_endpoint"        = "func-pep"
    "function_slot_private_endpoint"   = "staging-func-pep"
    "blob_private_endpoint"            = "blob-pep"
    "queue_private_endpoint"           = "queue-pep"
    "file_private_endpoint"            = "file-pep"

    # Subnets
    "app_subnet"      = "app-snet"
    "apim_subnet"     = "apim-snet"
    "function_subnet" = "func-snet"

    # Databases
    "cosmos_db"       = "cosmos"
    "cosmos_db_nosql" = "cosno"
    "postgresql"      = "psql"

    # Integration
    "eventhub_namespace" = "evhns"
    "function_app"       = "func"
    "app_service"        = "app"
    "app_service_plan"   = "asp"

    # Security
    "key_vault" = "kv"

    # Monitoring
    "application_insights" = "appi"

    # Miscellaneous
    "resource_group" = "rg"
  }
}