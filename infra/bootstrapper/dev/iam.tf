resource "azurerm_role_assignment" "private_dns_zone_contributor_integration_cd" {
  scope                = azurerm_resource_group.integration.id
  role_definition_name = "Private DNS Zone Contributor"
  principal_id         = module.azure.identities.infra.cd.principal_id
}

resource "azurerm_role_assignment" "private_dns_zone_contributor_e2e_cd" {
  scope                = azurerm_resource_group.e2e.id
  role_definition_name = "Private DNS Zone Contributor"
  principal_id         = module.azure.identities.infra.cd.principal_id
}

# resource "azurerm_role_assignment" "user_access_administrator" {
#   scope                = module.azure.resource_groups.test.id
#   role_definition_name = "User Access Administrator"
#   principal_id         = module.bootstrap.identities.infra.ci.principal_id
# }

# moved {
#   from = module.azure.azurerm_role_assignment.user_access_administrator[0]
#   to   = azurerm_role_assignment.user_access_administrator
# }
