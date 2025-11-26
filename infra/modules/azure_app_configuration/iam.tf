locals {
  # Distinct principal IDs from all Key Vaults
  distinct_app_principals = var.key_vaults != null ? toset(flatten([
    for kv in var.key_vaults : kv.app_principal_ids
  ])) : toset([])

  # For each distinct principal, collect all Key Vaults where they're listed
  app_assignments = {
    for principal_id in local.distinct_app_principals :
    principal_id => {
      principal_id = principal_id
      key_vaults = [
        for kv in var.key_vaults :
        {
          name                = kv.name
          resource_group_name = kv.resource_group_name
          has_rbac_support    = kv.has_rbac_support
        }
        if contains(kv.app_principal_ids, principal_id)
      ]
    }
  }

  # App Configuration role assignments for authorized teams
  appconfig_role_assignments = merge(
    {
      for idx, principal_id in var.authorized_teams.writers : "${principal_id}|writer" => {
        principal_id = principal_id
        role         = "writer"
      }
    },
    {
      for idx, principal_id in var.authorized_teams.readers : "${principal_id}|reader" => {
        principal_id = principal_id
        role         = "reader"
      }
    }
  )
}

# Assign both Key Vault and App Configuration roles to application principals
# Each principal gets:
# - Roles for all Key Vaults where they are listed
# - A single reader role for the App Configuration
module "app_roles" {
  for_each = local.app_assignments

  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  subscription_id = var.subscription_id
  principal_id    = each.value.principal_id

  key_vault = [
    for kv in each.value.key_vaults : {
      name                = kv.name
      resource_group_name = kv.resource_group_name
      has_rbac_support    = kv.has_rbac_support
      description         = "Allow application to read Key Vault secrets"
      roles = {
        secrets = "reader"
      }
    }
  ]

  app_config = [{
    name                = azurerm_app_configuration.this.name
    resource_group_name = azurerm_app_configuration.this.resource_group_name
    description         = "Allow application to read App Configuration settings"
    role                = "reader"
  }]
}

module "appconfig_team_roles" {
  for_each = local.appconfig_role_assignments

  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  subscription_id = var.subscription_id
  principal_id    = each.value.principal_id

  app_config = [
    {
      name                = azurerm_app_configuration.this.name
      resource_group_name = azurerm_app_configuration.this.resource_group_name
      description         = "Allow team to access App Configuration"
      role                = each.value.role
    }
  ]
}
