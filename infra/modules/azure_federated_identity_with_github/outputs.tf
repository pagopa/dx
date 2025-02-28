output "federated_ci_identity" {
  value = try(
    {
      id                  = azurerm_user_assigned_identity.ci[0].principal_id
      client_id           = azurerm_user_assigned_identity.ci[0].client_id
      name                = azurerm_user_assigned_identity.ci[0].name
      resource_group_name = azurerm_user_assigned_identity.ci[0].resource_group_name
    }, {}
  )

  description = "Data about the Continuos Integration managed identity created"
}

output "federated_cd_identity" {
  value = try(
    {
      id                  = azurerm_user_assigned_identity.cd[0].principal_id
      client_id           = azurerm_user_assigned_identity.cd[0].client_id
      name                = azurerm_user_assigned_identity.cd[0].name
      resource_group_name = azurerm_user_assigned_identity.cd[0].resource_group_name
    }, {}
  )

  description = "Data about the Continuos Delivery managed identity created"
}
