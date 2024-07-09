resource "azurerm_key_vault_access_policy" "this" {
  for_each = {
    for assignment in var.key_vault : "${assignment.resource_group_name}|${assignment.name}|${assignment.roles.secrets}|${assignment.roles.keys}|${assignment.roles.certificates}" => assignment
    if data.azurerm_key_vault.this["${assignment.resource_group_name}|${assignment.name}"].enable_rbac_authorization == false
  }

  key_vault_id = data.azurerm_key_vault.this["${each.value.resource_group_name}|${each.value.name}"].id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = var.principal_id

  secret_permissions      = setunion(lookup(local.permissions.secrets, each.value.roles.secrets, []), each.value.override_roles.secrets)
  certificate_permissions = setunion(lookup(local.permissions.certificates, each.value.roles.certificates, []), each.value.override_roles.certificates)
  key_permissions         = setunion(lookup(local.permissions.keys, each.value.roles.keys, []), each.value.override_roles.keys)
}

resource "azurerm_role_assignment" "secrets" {
  for_each = {
    for assignment in var.key_vault : "${assignment.resource_group_name}|${assignment.name}|${assignment.roles.secrets}" => assignment
    if data.azurerm_key_vault.this["${assignment.resource_group_name}|${assignment.name}"].enable_rbac_authorization == true &&
    try(assignment.roles.secrets, "") != ""
  }
  scope                = data.azurerm_key_vault.this["${each.value.resource_group_name}|${each.value.name}"].id
  role_definition_name = local.permissions_rbac.secrets[each.value.roles.secrets]
  principal_id         = var.principal_id
}

resource "azurerm_role_assignment" "keys" {
  for_each = {
    for assignment in var.key_vault : "${assignment.resource_group_name}|${assignment.name}|${assignment.roles.keys}" => assignment
    if data.azurerm_key_vault.this["${assignment.resource_group_name}|${assignment.name}"].enable_rbac_authorization == true &&
    try(assignment.roles.keys, "") != ""
  }
  scope                = data.azurerm_key_vault.this["${each.value.resource_group_name}|${each.value.name}"].id
  role_definition_name = local.permissions_rbac.keys[each.value.roles.keys]
  principal_id         = var.principal_id
}

resource "azurerm_role_assignment" "certificates" {
  for_each = {
    for assignment in var.key_vault : "${assignment.resource_group_name}|${assignment.name}|${assignment.roles.certificates}" => assignment
    if data.azurerm_key_vault.this["${assignment.resource_group_name}|${assignment.name}"].enable_rbac_authorization == true &&
    try(assignment.roles.certificates, "") != ""
  }
  scope                = data.azurerm_key_vault.this["${each.value.resource_group_name}|${each.value.name}"].id
  role_definition_name = local.permissions_rbac.certificates[each.value.roles.certificates]
  principal_id         = var.principal_id
}