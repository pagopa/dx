resource "random_integer" "appcs_instance" {
  min = 1
  max = 99
}

module "private_appcs" {
  source  = "pagopa-dx/azure-app-configuration/azurerm"
  version = "~> 0.0"

  environment         = (merge(local.environment, { instance_number = random_integer.appcs_instance.result }))
  resource_group_name = azurerm_resource_group.e2e_appcs.name

  subnet_pep_id = data.azurerm_subnet.pep.id

  virtual_network = {
    name                = local.e2e_virtual_network.name
    resource_group_name = local.e2e_virtual_network.resource_group_name
  }

  private_dns_zone_resource_group_name = data.azurerm_resource_group.network.name
  tags                                 = local.tags
}
