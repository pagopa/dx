locals {
  private_dns_zones = {
    "apim"                     = "privatelink.azure-api.net"
    "azure_api_net"            = "azure-api.net"
    "azurewebsites"            = "privatelink.azurewebsites.net"
    "blob"                     = "privatelink.blob.core.windows.net"
    "container_app"            = "privatelink.${var.environment.location}.azurecontainerapps.io"
    "documents"                = "privatelink.documents.azure.com"
    "file"                     = "privatelink.file.core.windows.net"
    "management_azure_api_net" = "management.azure-api.net"
    "postgres"                 = "privatelink.postgres.database.azure.com"
    "queue"                    = "privatelink.queue.core.windows.net"
    "scm_azure_api_net"        = "scm.azure-api.net"
    "servicebus"               = "privatelink.servicebus.windows.net"
    "table"                    = "privatelink.table.core.windows.net"
  }

  flat_map = {
    for pair in flatten([
      for key, value in local.private_dns_zones : [
        for test_mode in var.test_modes : {
          key = "${key}-${test_mode}"
          value = {
            dns_zone  = value
            test_mode = test_mode
          }
        }
      ]
    ]) : pair.key => pair.value
  }
}

resource "azurerm_private_dns_zone" "tests_peps" {
  for_each = local.flat_map

  name                = each.value.dns_zone
  resource_group_name = data.azurerm_resource_group.tests[each.value.test_mode].name

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "tests_peps" {
  for_each = local.flat_map

  name                  = azurerm_virtual_network.tests[each.value.test_mode].name
  resource_group_name   = data.azurerm_resource_group.tests[each.value.test_mode].name
  private_dns_zone_name = azurerm_private_dns_zone.tests_peps[each.key].name
  virtual_network_id    = azurerm_virtual_network.tests[each.value.test_mode].id
  registration_enabled  = false

  tags = var.tags
}
