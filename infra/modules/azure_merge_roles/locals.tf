locals {
  # Default to the role definition scope unless the caller needs to narrow the
  # role availability to a subset of child scopes.
  assignable_scopes = sort(distinct(var.assignable_scopes == null ? [var.scope] : var.assignable_scopes))

  merged_description = coalesce(
    var.description,
    "Merged role from: ${join(", ", sort(var.source_roles))}",
  )

  # Azure role definitions expose permissions as a list of permission objects,
  # not as one flat permission bag.
  source_permissions = flatten([
    for role_definition in values(data.azurerm_role_definition.source) : role_definition.permissions
  ])

  # Normalize each permission object before de-duplicating it. Keeping blocks
  # separate preserves the original Actions/NotActions and
  # DataActions/NotDataActions relationships.
  permission_blocks_by_key = {
    for permission in local.source_permissions : jsonencode({
      actions          = sort(distinct(tolist(try(permission.actions, []))))
      data_actions     = sort(distinct(tolist(try(permission.data_actions, []))))
      not_actions      = sort(distinct(tolist(try(permission.not_actions, []))))
      not_data_actions = sort(distinct(tolist(try(permission.not_data_actions, []))))
      }) => {
      actions          = sort(distinct(tolist(try(permission.actions, []))))
      data_actions     = sort(distinct(tolist(try(permission.data_actions, []))))
      not_actions      = sort(distinct(tolist(try(permission.not_actions, []))))
      not_data_actions = sort(distinct(tolist(try(permission.not_data_actions, []))))
    }
  }

  # Emit a stable, sorted list so plans stay deterministic across runs.
  permission_blocks = [
    for key in sort(keys(local.permission_blocks_by_key)) : local.permission_blocks_by_key[key]
  ]
}
