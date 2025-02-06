data "azurerm_resource_group" "test_rg" {
  name = "${module.naming_convention.project}-test-rg-01"
}

data "azurerm_resource_group" "net_rg" {
  name = "${module.naming_convention.project}-network-rg-01"
}

data "azurerm_virtual_network" "test_vnet" {
  name                = "${module.naming_convention.project}-common-vnet-01"
  resource_group_name = data.azurerm_resource_group.net_rg.name
}

data "azurerm_subnet" "pep_snet" {
  name                 = "${module.naming_convention.project}-pep-snet-01"
  virtual_network_name = data.azurerm_virtual_network.test_vnet.name
  resource_group_name  = data.azurerm_virtual_network.test_vnet.resource_group_name
}

module "storage_account" {
  source  = "pagopa/dx-azure-storage-account/azurerm"
  version = "~> 0"

  environment         = local.environment
  resource_group_name = data.azurerm_resource_group.test_rg.name

  subnet_pep_id                       = data.azurerm_subnet.pep_snet.id
  force_public_network_access_enabled = false

  tier = "s"

  subservices_enabled = {
    blob  = true
    file  = false
    queue = false
    table = false
  }

  tags = local.tags
}
