module "dx_app_cd_resource_group_deploy" {
  source  = "pagopa-dx/azure-merge-roles/azurerm"
  version = "~> 0.1"

  scope     = data.azurerm_subscription.current.id
  role_name = "${local.subscription_role_name_prefix} DX App CD Resource Groups"
  reason    = "Merged role for DX App CD identities at resource group scope"
  source_roles = [
    "Website Contributor",
    "CDN Profile Contributor",
    "Container Apps Contributor",
    "Storage Blob Data Contributor",
    "PagoPA Static Web Apps List Secrets",
  ]
}

module "dx_app_ci_resource_group_reader" {
  source  = "pagopa-dx/azure-merge-roles/azurerm"
  version = "~> 0.1"

  scope     = data.azurerm_subscription.current.id
  role_name = "${local.subscription_role_name_prefix} DX App CI Resource Groups"
  reason    = "Merged role for DX App CI identities at resource group scope"
  source_roles = [
    "PagoPA IaC Reader",
    "PagoPA Static Web Apps List Secrets",
  ]
}

module "dx_infra_cd_private_networking" {
  source  = "pagopa-dx/azure-merge-roles/azurerm"
  version = "~> 0.1"

  scope     = data.azurerm_subscription.current.id
  role_name = "${local.subscription_role_name_prefix} DX Infra CD Private Networking"
  reason    = "Merged role for DX Infra CD identities managing private DNS networking"
  source_roles = [
    "Private DNS Zone Contributor",
    "Network Contributor",
  ]
}

module "dx_infra_cd_resource_group_deploy" {
  source  = "pagopa-dx/azure-merge-roles/azurerm"
  version = "~> 0.1"

  scope     = data.azurerm_subscription.current.id
  role_name = "${local.subscription_role_name_prefix} DX Infra CD Resource Groups"
  reason    = "Merged role for DX Infra CD identities at resource group scope"
  source_roles = [
    "Contributor",
    "User Access Administrator",
    "Key Vault Secrets Officer",
    "Key Vault Certificates Officer",
    "Key Vault Crypto Officer",
    "Storage Blob Data Contributor",
    "Storage Queue Data Contributor",
    "Storage Table Data Contributor",
    "Container Apps Contributor",
  ]
}

module "dx_infra_cd_subscription_admin" {
  source  = "pagopa-dx/azure-merge-roles/azurerm"
  version = "~> 0.1"

  scope     = data.azurerm_subscription.current.id
  role_name = "${local.subscription_role_name_prefix} DX Infra CD Subscription"
  reason    = "Merged role for DX Infra CD identities at subscription scope"
  source_roles = [
    "Reader",
    "Role Based Access Control Administrator",
    "Log Analytics Contributor",
    "Azure Service Bus Data Owner",
    "API Management Service Contributor"
  ]
  additional_actions = [
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

module "dx_infra_ci_resource_group_reader" {
  source  = "pagopa-dx/azure-merge-roles/azurerm"
  version = "~> 0.1"

  scope     = data.azurerm_subscription.current.id
  role_name = "${local.subscription_role_name_prefix} DX Infra CI Resource Groups"
  reason    = "Merged role for DX Infra CI identities at resource group scope"
  source_roles = [
    "DocumentDB Account Contributor",
    "Key Vault Secrets User",
    "Key Vault Certificate User",
    "Key Vault Crypto Officer",
    "Storage Blob Data Reader",
    "Storage Queue Data Reader",
    "Storage Table Data Reader",
    "Container Apps Operator",
    "Container Apps Jobs Operator",
  ]
}

module "dx_infra_ci_subscription_reader" {
  source  = "pagopa-dx/azure-merge-roles/azurerm"
  version = "~> 0.1"

  scope     = data.azurerm_subscription.current.id
  role_name = "${local.subscription_role_name_prefix} DX Infra CI Subscription"
  reason    = "Merged role for DX Infra CI identities at subscription scope"
  source_roles = [
    "Reader",
    "Reader and Data Access",
    "PagoPA IaC Reader",
    "PagoPA API Management Service List Secrets"
  ]
}

module "dx_function_host_storage" {
  source  = "pagopa-dx/azure-merge-roles/azurerm"
  version = "~> 0.1"

  scope     = data.azurerm_subscription.current.id
  role_name = "${local.subscription_role_name_prefix} DX Function Host Storage"
  reason    = "Merged role for Function App host storage access"
  source_roles = [
    "Storage Blob Data Owner",
    "Storage Account Contributor",
    "Storage Queue Data Contributor",
  ]
}

module "dx_function_durable_storage" {
  source  = "pagopa-dx/azure-merge-roles/azurerm"
  version = "~> 0.1"

  scope     = data.azurerm_subscription.current.id
  role_name = "${local.subscription_role_name_prefix} DX Function Durable Storage"
  reason    = "Merged role for Function App durable storage access"
  source_roles = [
    "Storage Blob Data Contributor",
    "Storage Queue Data Contributor",
    "Storage Table Data Contributor",
  ]
}
