resource "azurerm_key_vault_access_policy" "this" {
  for_each = {
    for assignment in local.norm_vaults : "${assignment.resource_group_name}|${assignment.name}|${assignment.roles.secrets}|${assignment.roles.keys}|${assignment.roles.certificates}" => assignment
    if assignment.has_rbac_support == false
  }

  key_vault_id = each.value.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = var.principal_id

  secret_permissions      = setunion(lookup(local.permissions.secrets, each.value.roles.secrets, []), each.value.override_roles.secrets)
  certificate_permissions = setunion(lookup(local.permissions.certificates, each.value.roles.certificates, []), each.value.override_roles.certificates)
  key_permissions         = setunion(lookup(local.permissions.keys, each.value.roles.keys, []), each.value.override_roles.keys)
}

resource "azurerm_role_assignment" "secrets" {
  for_each = {
    for assignment in local.norm_vaults : "${assignment.resource_group_name}|${assignment.name}|${assignment.roles.secrets}" => assignment
    if assignment.has_rbac_support == true &&
    try(assignment.roles.secrets, "") != ""
  }
  scope                = each.value.id
  role_definition_name = local.permissions_rbac.secrets[each.value.roles.secrets]
  principal_id         = var.principal_id
  description          = each.value.description
}

resource "azurerm_role_assignment" "keys" {
  for_each = {
    for assignment in local.norm_vaults : "${assignment.resource_group_name}|${assignment.name}|${assignment.roles.keys}" => assignment
    if assignment.has_rbac_support == true &&
    try(assignment.roles.keys, "") != ""
  }
  scope                = each.value.id
  role_definition_name = local.permissions_rbac.keys[each.value.roles.keys]
  principal_id         = var.principal_id
  description          = each.value.description
}

resource "azurerm_role_assignment" "certificates" {
  for_each = {
    for assignment in local.norm_vaults : "${assignment.resource_group_name}|${assignment.name}|${assignment.roles.certificates}" => assignment
    if assignment.has_rbac_support == true &&
    try(assignment.roles.certificates, "") != ""
  }
  scope                = each.value.id
  role_definition_name = local.permissions_rbac.certificates[each.value.roles.certificates]
  principal_id         = var.principal_id
  description          = each.value.description
}