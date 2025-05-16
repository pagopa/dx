locals {
  tags = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/package.json")).name, "unknown") })
  location_short = tomap({
    "italynorth" = "itn",
    "westeurope" = "weu"
  })[var.environment.location]

  project = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = local.location_short,
    domain          = var.environment.domain,
    instance_number = tonumber(var.environment.instance_number),
  }

  vpn_enabled = var.vpn.cidr_subnet != "" && var.vpn.dnsforwarder_cidr_subnet != ""

  nat_enabled = var.nat_enabled && !var.test_enabled

  private_dns_zones = {
    "redis"                    = "privatelink.redis.cache.windows.net"
    "psql"                     = "privatelink.postgres.database.azure.com"
    "servicebus"               = "privatelink.servicebus.windows.net"
    "documents"                = "privatelink.documents.azure.com"
    "blob"                     = "privatelink.blob.core.windows.net"
    "file"                     = "privatelink.file.core.windows.net"
    "queue"                    = "privatelink.queue.core.windows.net"
    "table"                    = "privatelink.table.core.windows.net"
    "azurewebsites"            = "privatelink.azurewebsites.net"
    "srch"                     = "privatelink.search.windows.net"
    "vault"                    = "privatelink.vaultcore.azure.net"
    "azure_api_net"            = "azure-api.net"
    "management_azure_api_net" = "management.azure-api.net"
    "scm_azure_api_net"        = "scm.azure-api.net"
    "container_app"            = "privatelink.italynorth.azurecontainerapps.io"
  }
}
