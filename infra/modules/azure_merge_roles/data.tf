# ============================================================================
# DATA SOURCES
# ============================================================================
# Resolve every source role in the same scope as the merged role definition so
# the module can merge both built-in roles and custom roles defined at that
# scope without re-encoding role metadata.
data "azurerm_role_definition" "source" {
  for_each = local.source_roles_by_index
  name     = each.value
  scope    = var.scope
}
