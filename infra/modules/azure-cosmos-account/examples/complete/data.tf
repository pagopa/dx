data "azurerm_subnet" "pep" {
  name                 = "${local.project}-pep-snet-01"
  virtual_network_name = "${local.project}-common-vnet-01"
  resource_group_name  = "${local.project}-common-rg-01"
}

data "azurerm_monitor_action_group" "example" {
  name                = replace("${local.environment.prefix}-${local.environment.env_short}-error", "-", "")
  resource_group_name = "${local.environment.prefix}-${local.environment.env_short}-rg-common"
}