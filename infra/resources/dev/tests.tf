module "testing" {
  source = "../_modules/testing"

  environment = local.environment
  test_modes  = local.test_modes

  vnet_common = {
    name                = data.azurerm_virtual_network.common.name
    id                  = data.azurerm_virtual_network.common.id
    resource_group_name = data.azurerm_virtual_network.common.resource_group_name
    subnet_ids          = data.azurerm_subnet.subnets[*].id
  }

  runner_subnet_name = data.azurerm_subnet.runner.name

  private_dns_zone_names = data.azurerm_private_dns_zone.tests_peps[*].name

  tags = local.tags
}
