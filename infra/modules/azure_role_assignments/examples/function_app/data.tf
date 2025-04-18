data "azurerm_resource_group" "weu_common" {
  name = "${local.environment.prefix}-${local.environment.env_short}-rg-common"
}


data "azurerm_virtual_network" "itn_common" {
  name                = "${local.project}-common-vnet-01"
  resource_group_name = "${local.project}-network-rg-01"
}

data "azurerm_subnet" "private_endpoints_subnet" {
  name                 = "${local.project}-pep-snet-01"
  virtual_network_name = data.azurerm_virtual_network.itn_common.name
  resource_group_name  = data.azurerm_virtual_network.itn_common.resource_group_name
}

data "azurerm_subscription" "current" {}
