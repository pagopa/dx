---
page_title: "dx_available_subnet_cidr Resource - terraform-provider-azure"
subcategory: ""
description: |-
  Finds an available CIDR block for a new subnet within a specified Azure Virtual Network.
---

# available_subnet_cidr Resource

Finds an available CIDR block for a new subnet within a specified Azure Virtual Network.

## Example Usage

```hcl
resource "dx_available_subnet_cidr" "next_cidr" {
  virtual_network_id = azurerm_virtual_network.example.id
  prefix_length      = 24  # For a /24 subnet
}

resource "azurerm_subnet" "new_subnet" {
  name                 = "example-subnet"
  resource_group_name  = azurerm_resource_group.example.name
  virtual_network_name = azurerm_virtual_network.example.name
  address_prefixes     = [dx_available_subnet_cidr.next_cidr.cidr_block]
}
```

When creating multiple subnets, it is necessary to use `depends_on` to prevent CIDR block overlaps:

```hcl
resource "dx_available_subnet_cidr" "next_cidr_1" {
  virtual_network_id = azurerm_virtual_network.this.id
  prefix_length      = 24
}

resource "azurerm_subnet" "new_subnet_1" {
  name                 = "my-new-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [dx_available_subnet_cidr.next_cidr_1.cidr_block]
}

resource "dx_available_subnet_cidr" "next_cidr_2" {
  virtual_network_id = azurerm_virtual_network.this.id
  prefix_length      = 29

  # Ensures the first CIDR block is allocated before finding the next one
  depends_on = [
    azurerm_subnet.new_subnet_1
  ]
}

resource "azurerm_subnet" "new_subnet_2" {
  name                 = "my-new-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [dx_available_subnet_cidr.next_cidr_2.cidr_block]
}
```

## Schema

### Required

- `prefix_length` (Number) The desired prefix length for the new subnet CIDR (e.g., 24 for a /24 subnet). Must be larger than the VNet prefix and smaller or equal to 29.
- `virtual_network_id` (String) The Azure Resource ID of the Virtual Network where the CIDR block should be allocated. Must be in the format `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/virtualNetworks/{vnetName}`.

### Read-Only

- `id` - A unique identifier for the resource, combining the virtual network ID, prefix length, and allocated CIDR.

- `cidr_block` (String) The calculated available CIDR block.

## Import

This resource cannot be imported as it is a virtual resource that doesn't correspond to an actual Azure resource.

## Notes

- This is a virtual resource that doesn't create an actual resource in Azure. It only calculates and reserves a CIDR block in your Terraform state.
- The allocated CIDR is determined by analyzing the existing subnets in the VNet and finding an available block that doesn't overlap.
- Changing either `virtual_network_id` or `prefix_length` after creation requires recreating the resource.
