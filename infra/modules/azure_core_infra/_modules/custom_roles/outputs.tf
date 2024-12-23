output "pagopa_apim_list_secrets" {
  value = {
    id   = azurerm_role_definition.pagopa_apim_list_secrets.id
    name = azurerm_role_definition.pagopa_apim_list_secrets.name
  }
}