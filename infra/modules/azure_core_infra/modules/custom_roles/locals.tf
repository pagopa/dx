locals {
  subscription_id   = var.subscription_id != null ? trimspace(var.subscription_id) : data.azurerm_subscription.current[0].id
  subscription_name = var.subscription_name != null ? trimspace(var.subscription_name) : data.azurerm_subscription.current[0].display_name

  subscription_role_name_prefix = local.subscription_name

  infra_cd_subscription_additional_actions = [
    # Allow to join existing NAT Gateways to subnets
    "Microsoft.Network/natGateways/join/action",
    # Allow creation and join of Private Endpoints to virtual networks and subnets
    "Microsoft.Resources/deployments/*",                               # Create and manage a deployment
    "Microsoft.Resources/subscriptions/resourcegroups/resources/read", # Read the resources for the resource group
    "Microsoft.Network/virtualNetworks/read",                          # Read the virtual network definition
    "Microsoft.Network/virtualNetworks/subnets/read",                  # Read a virtual network subnet definition
    "Microsoft.Network/virtualNetworks/subnets/write",                 # Creates a virtual network subnet or updates an existing virtual network subnet.
    "Microsoft.Network/virtualNetworks/subnets/join/action",           # Allow a private endpoint to join a virtual network
    "Microsoft.Network/privateEndpoints/read",                         # Read a private endpoint resource
    "Microsoft.Network/privateEndpoints/write",                        # Creates a new private endpoint, or updates an existing private endpoint
    "Microsoft.Network/locations/availablePrivateEndpointTypes/read",  # Read available private endpoint resources
    # Allow creation and join of PrivateLink resources to virtual networks and subnets
    "Microsoft.Network/privateLinkServices/read",                             # Read a private link service resource
    "Microsoft.Network/privateLinkServices/write",                            # Creates a new private link service, or updates an existing private link service
    "Microsoft.Network/privateLinkServices/privateEndpointConnections/read",  # Read a private endpoint connection definition
    "Microsoft.Network/privateLinkServices/privateEndpointConnections/write", # Creates a new private endpoint connection, or updates an existing private endpoint connection
    "Microsoft.Network/networkSecurityGroups/join/action",                    # Joins a network security group
  ]
}
