module "dx_app_cd_resource_group_deploy" {
  source  = "pagopa-dx/azure-merge-roles/azurerm"
  version = "~> 0.0"

  scope     = data.azurerm_subscription.current.id
  role_name = "DX App CD Resource Groups"
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
  version = "~> 0.0"

  scope     = data.azurerm_subscription.current.id
  role_name = "DX App CI Resource Groups"
  reason    = "Merged role for DX App CI identities at resource group scope"
  source_roles = [
    "PagoPA IaC Reader",
    "PagoPA Static Web Apps List Secrets",
  ]
}

module "dx_infra_cd_private_networking" {
  source  = "pagopa-dx/azure-merge-roles/azurerm"
  version = "~> 0.0"

  scope     = data.azurerm_subscription.current.id
  role_name = "DX Infra CD Private Networking"
  reason    = "Merged role for DX Infra CD identities managing private DNS networking"
  source_roles = [
    "Private DNS Zone Contributor",
    "Network Contributor",
  ]
}

module "dx_infra_cd_resource_group_deploy" {
  source  = "pagopa-dx/azure-merge-roles/azurerm"
  version = "~> 0.0"

  scope     = data.azurerm_subscription.current.id
  role_name = "DX Infra CD Resource Groups"
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
  version = "~> 0.0"

  scope     = data.azurerm_subscription.current.id
  role_name = "DX Infra CD Subscription"
  reason    = "Merged role for DX Infra CD identities at subscription scope"
  source_roles = [
    "Reader",
    "Role Based Access Control Administrator",
  ]
}

module "dx_infra_ci_resource_group_reader" {
  source  = "pagopa-dx/azure-merge-roles/azurerm"
  version = "~> 0.0"

  scope     = data.azurerm_subscription.current.id
  role_name = "DX Infra CI Resource Groups"
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
  version = "~> 0.0"

  scope     = data.azurerm_subscription.current.id
  role_name = "DX Infra CI Subscription"
  reason    = "Merged role for DX Infra CI identities at subscription scope"
  source_roles = [
    "Reader",
    "Reader and Data Access",
    "PagoPA IaC Reader",
  ]
}

module "dx_function_host_storage" {
  source  = "pagopa-dx/azure-merge-roles/azurerm"
  version = "~> 0.0"

  scope     = data.azurerm_subscription.current.id
  role_name = "DX Function Host Storage"
  reason    = "Merged role for Function App host storage access"
  source_roles = [
    "Storage Blob Data Owner",
    "Storage Account Contributor",
    "Storage Queue Data Contributor",
  ]
}

module "dx_function_durable_storage" {
  source  = "pagopa-dx/azure-merge-roles/azurerm"
  version = "~> 0.0"

  scope     = data.azurerm_subscription.current.id
  role_name = "DX Function Durable Storage"
  reason    = "Merged role for Function App durable storage access"
  source_roles = [
    "Storage Blob Data Contributor",
    "Storage Queue Data Contributor",
    "Storage Table Data Contributor",
  ]
}