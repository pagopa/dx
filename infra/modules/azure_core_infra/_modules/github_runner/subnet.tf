resource "azurerm_subnet" "runner_snet" {
  name = provider::dx::resource_name(merge(var.name_env, {
    resource_type = "subnet",
  }))
  virtual_network_name = var.virtual_network.name
  resource_group_name  = var.virtual_network.resource_group_name
  address_prefixes     = [var.subnet_cidr]
}