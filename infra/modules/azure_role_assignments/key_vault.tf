data "azurerm_key_vault" "this" {
  for_each = { for key_vault in local.key_vault.vaults : "${key_vault.name}|${key_vault.resource_group_name}" => key_vault }

  name                = each.value.name
  resource_group_name = each.value.resource_group_name
}

resource "azurerm_key_vault_access_policy" "this" {
  for_each = {
    for assignment in var.key_vault : "${assignment.name}|${assignment.resource_group_name}" => assignment
    if data.azurerm_key_vault.this["${assignment.name}|${assignment.resource_group_name}"].enable_rbac_authorization == false
  }

  key_vault_id = data.azurerm_key_vault.this["${each.value.name}|${each.value.resource_group_name}"]
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = var.principal_id

  secret_permissions      = setunion(lookup(local.key_vault.permissions, each.value.roles.secrets, []), each.value.override_roles.secrets)
  certificate_permissions = setunion(lookup(local.key_vault.permissions, each.value.roles.certificates, []), each.value.override_roles.certificates)
  key_permissions         = setunion(lookup(local.key_vault.permissions, each.value.roles.keys, []), each.value.override_roles.keys)
}

resource "azurerm_role_assignment" "secrets" {
  for_each = {
    for assignment in var.key_vault : "${assignment.name}|${assignment.resource_group_name}" => assignment
    if data.azurerm_key_vault.this["${assignment.name}|${assignment.resource_group_name}"].enable_rbac_authorization == true&&
    try(assignment.roles.secrets, "") != ""
  }
  scope                = data.azurerm_key_vault.this["${each.value.name}|${each.value.resource_group_name}"].id
  role_definition_name = local.key_vault.permissions_rbac.secrets[each.value.roles.secrets]
  principal_id         = var.principal_id
}

resource "azurerm_role_assignment" "keys" {
  for_each = {
    for assignment in var.key_vault : "${assignment.name}|${assignment.resource_group_name}" => assignment
    if data.azurerm_key_vault.this["${assignment.name}|${assignment.resource_group_name}"].enable_rbac_authorization == true &&
    try(assignment.roles.keys, "") != ""
  }
  scope                = data.azurerm_key_vault.this["${each.value.name}|${each.value.resource_group_name}"].id
  role_definition_name = local.key_vault.permissions_rbac.keys[each.value.roles.keys]
  principal_id         = var.principal_id
}

resource "azurerm_role_assignment" "certificates" {
  for_each = {
    for assignment in var.key_vault : "${assignment.name}|${assignment.resource_group_name}" => assignment
    if data.azurerm_key_vault.this["${assignment.name}|${assignment.resource_group_name}"].enable_rbac_authorization == true &&
    try(assignment.roles.certificates, "") != ""
  }
  scope                = data.azurerm_key_vault.this["${each.value.name}|${each.value.resource_group_name}"].id
  role_definition_name = local.key_vault.permissions_rbac.certificates[each.value.roles.certificates]
  principal_id         = var.principal_id
}