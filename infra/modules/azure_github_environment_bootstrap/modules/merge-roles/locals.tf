# ============================================================================
# LOCALS - Permission aggregation logic (RBAC-pure merge)
# ============================================================================
# This merge preserves Azure RBAC semantics exactly:
# - actions     = union of all allows
# - notActions  = union of all denies
# Resulting permissions are identical to assigning multiple roles
# at the same scope.

locals {
  # --------------------------------------------------------------------------
  # Raw merged permissions
  # --------------------------------------------------------------------------

  actions = distinct(flatten([
    for r in data.azurerm_role_definition.source :
    r.permissions[0].actions
  ]))

  data_actions = distinct(flatten([
    for r in data.azurerm_role_definition.source :
    r.permissions[0].data_actions
  ]))

  not_actions = distinct(flatten([
    for r in data.azurerm_role_definition.source :
    r.permissions[0].not_actions
  ]))

  not_data_actions = distinct(flatten([
    for r in data.azurerm_role_definition.source :
    r.permissions[0].not_data_actions
  ]))
}
