data "dx_available_subnet_cidr" "next_cidr" {
  virtual_network_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-network-rg-01/providers/Microsoft.Network/virtualNetworks/dx-d-itn-common-vnet-01"
  prefix_length      = 24
}