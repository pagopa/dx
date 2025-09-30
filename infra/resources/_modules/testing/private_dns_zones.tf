locals {
  private_dns_zone_map = {
    for pair in flatten([
      for value in var.private_dns_zone_names : [
        for test_mode in var.test_modes : {
          key = "${value}-${test_mode}"
          value = {
            private_dns_zone = value
            test_mode        = test_mode
          }
        }
      ]
    ]) : pair.key => pair.value
  }
}

resource "azurerm_private_dns_zone_virtual_network_link" "tests_peps" {
  for_each = local.private_dns_zone_map

  name                  = azurerm_virtual_network.tests[each.value.test_mode].name
  resource_group_name   = var.vnet_common.resource_group_name
  private_dns_zone_name = var.private_dns_zone_names[index(var.private_dns_zone_names, each.value.private_dns_zone)]
  virtual_network_id    = azurerm_virtual_network.tests[each.value.test_mode].id
  registration_enabled  = false

  tags = var.tags
}
