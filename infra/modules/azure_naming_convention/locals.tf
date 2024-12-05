locals {
  # General
  location_map = {
    "italynorth"         = "itn",
    "westeurope"         = "weu",
    "germanywestcentral" = "gwc"
    "spaincentral"       = "spc"
  }

  location_short = lookup(local.location_map, var.environment.location, "neu")
  project        = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
  domain         = var.environment.domain == null ? "-" : "-${var.environment.domain}-"

  app_prefix = "${local.project}${local.domain}${var.environment.app_name}"
  app_suffix = var.environment.instance_number


  # Map resource types to their abbreviations
  # Ref.: https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-abbreviations
  resource_abbreviations = {
    # Compute
    "Virtual Machine"           = "vm"
    "Virtual Machine Scale Set" = "vmss"
    "Availability Set"          = "as"
    "Dedicated Host"            = "dh"

    # Storage
    "Storage Account" = "st"
    "Blob Storage"    = "blob"
    "Queue Storage"   = "queue"
    "Table Storage"   = "table"
    "File Storage"    = "file"

    # Networking
    "Virtual Network"        = "vnet"
    "Network Security Group" = "nsg"
    "Application Gateway"    = "agw"
    "Load Balancer"          = "lb"
    "Public IP Address"      = "pip"
    "DNS Zone"               = "dns"

    # Databases
    "SQL Database"         = "sql"
    "Cosmos DB"            = "cosmo"
    "MySQL Database"       = "mysql"
    "PostgreSQL Database"  = "pg"
    "MariaDB Database"     = "mdb"
    "SQL Managed Instance" = "mi"

    # Integration
    "Event Hub Namespace"   = "evhns"
    "Service Bus Namespace" = "sbns"
    "Logic App"             = "logic"
    "Function App"          = "func"
    "App Service"           = "app"

    # Security
    "Key Vault"        = "kv"
    "Managed Identity" = "mi"

    # Monitoring
    "Application Insights"    = "ai"
    "Log Analytics Workspace" = "law"

    # Miscellaneous
    "Resource Group"   = "rg"
    "Subscription"     = "sub"
    "Management Group" = "mg"
    "Policy"           = "policy"
    "Blueprint"        = "bp"
  }

  abbreviation = lookup(local.resource_abbreviations, var.resource_type, "unknown")
}
