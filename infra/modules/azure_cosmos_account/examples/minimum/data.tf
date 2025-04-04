data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = "",
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}
data "azurerm_monitor_action_group" "example" {
  name                = replace("${local.environment.prefix}-${local.environment.env_short}-error", "-", "")
  resource_group_name = "${local.environment.prefix}-${local.environment.env_short}-rg-common"
}
