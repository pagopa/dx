# ============================================================================
# DATA SOURCES
# ============================================================================
# Get current Azure subscription context
data "azurerm_subscription" "current" {}

# Fetch role definitions for each source role name
# This allows us to inspect their permissions and merge them
data "azurerm_role_definition" "source" {
  for_each = toset(var.source_roles)
  name     = each.key
}
