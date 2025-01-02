resource "azurerm_role_definition" "pagopa_apim_list_secrets" {
  name        = "PagoPA API Management Service List Secrets"
  scope       = local.subscription_id
  description = "List only access to API Management secrets"

  permissions {
    actions = [
      "Microsoft.ApiManagement/service/*/listSecrets/action",
    ]
    not_actions = []
  }

  assignable_scopes = [
    local.subscription_id
  ]
}