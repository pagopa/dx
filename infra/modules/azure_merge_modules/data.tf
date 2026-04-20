# ============================================================================
# DATA SOURCES
# ============================================================================
# Resolve every source built-in role once so the module can reuse the provider's
# normalized view of the role definition instead of re-encoding role metadata.
data "azurerm_role_definition" "source" {
  for_each = toset(var.source_roles)
  name     = each.key
}
