mock_provider "azurerm" {}

variables {
  resource_group_name = "rg-test"

  tags = {
    Environment = "Test"
  }

  private_dns_zones = {
    blob  = "privatelink.blob.core.windows.net"
    vault = "privatelink.vaultcore.azure.net"
  }

  virtual_network = {
    id   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworks/vnet-test"
    name = "vnet-test"
  }
}

override_resource {
  target          = azurerm_private_dns_zone.private_dns_zones["vault"]
  override_during = plan
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/privateDnsZones/privatelink.vaultcore.azure.net"
  }
}

override_resource {
  target          = azurerm_private_dns_zone.private_dns_zones["blob"]
  override_during = plan
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net"
  }
}

run "dns_links_reference_the_matching_private_zone_id" {
  command = plan

  assert {
    condition     = azurerm_private_dns_zone_virtual_network_link.private_dns_links["vault"].private_dns_zone_id == azurerm_private_dns_zone.private_dns_zones["vault"].id
    error_message = "The Key Vault DNS link must use the Key Vault private DNS zone ID."
  }

  assert {
    condition     = azurerm_private_dns_zone_virtual_network_link.private_dns_links["blob"].private_dns_zone_id == azurerm_private_dns_zone.private_dns_zones["blob"].id
    error_message = "The Blob DNS link must use the Blob private DNS zone ID."
  }
}
