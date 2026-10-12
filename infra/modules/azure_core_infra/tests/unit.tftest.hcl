mock_provider "azurerm" {}

run "private_dns_links_preserve_zone_and_network" {
  command = plan

  module {
    source = "./_modules/dns"
  }

  variables {
    resource_group_name = "rg-network"
    tags                = { Owner = "DevEx" }
    virtual_network = {
      id   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/virtualNetworks/vnet-test"
      name = "vnet-test"
    }
    private_dns_zones = { blob = "privatelink.blob.core.windows.net" }
  }

  override_resource {
    override_during = plan
    target          = azurerm_private_dns_zone.private_dns_zones["blob"]
    values = {
      id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net"
    }
  }

  assert {
    condition     = azurerm_private_dns_zone_virtual_network_link.private_dns_links["blob"].private_dns_zone_id == azurerm_private_dns_zone.private_dns_zones["blob"].id
    error_message = "The link must use the existing zone's resource ID."
  }
  assert {
    condition     = azurerm_private_dns_zone_virtual_network_link.private_dns_links["blob"].virtual_network_id == var.virtual_network.id && !azurerm_private_dns_zone_virtual_network_link.private_dns_links["blob"].registration_enabled
    error_message = "The network and disabled registration must remain unchanged."
  }
}
