locals {
  project = module.naming_convention.project
  prefix  = module.naming_convention.prefix
  suffix  = module.naming_convention.suffix

  tags = !var.test_enable ? var.tags : merge(var.tags, {
    TestResource = "DeleteIn30Days"
  })

  vpn_enable = var.vpn.cidr_subnet != "" && var.vpn.dnsforwarder_cidr_subnet != "" && !var.test_enable

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
  }
}