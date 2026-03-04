locals {
  # Flatten application principal assignments using static index-based keys
  # while values (principal_id, scope) can be unknown at plan time.
  # Knowing keys at plan time is required to avoid Terraform errors
  app_principal_assignments = flatten([
    for kv_idx, kv in var.key_vaults != null ? var.key_vaults : [] : [
      for principal_idx, principal_id in kv.app_principal_ids : {
        key          = "${kv_idx}-${principal_idx}"
        principal_id = principal_id
        kv_name      = kv.name
        kv_rg        = kv.resource_group_name
      }
    ]
  ])

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

resource "azurerm_role_assignment" "app_kv_secrets_user" {
  for_each = { for item in local.app_principal_assignments : item.key => item }

  principal_id         = each.value.principal_id
  role_definition_name = "Key Vault Secrets User"
  scope                = "/subscriptions/${var.subscription_id}/resourceGroups/${each.value.kv_rg}/providers/Microsoft.KeyVault/vaults/${each.value.kv_name}"
}

resource "azurerm_role_assignment" "app_appconfig_reader" {
  for_each = { for item in local.app_principal_assignments : item.key => item }

  principal_id         = each.value.principal_id
  role_definition_name = "App Configuration Data Reader"
  scope                = azurerm_app_configuration.this.id
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
