resource "azapi_resource" "auth" {
  count = var.authentication != null ? 1 : 0

  type      = "Microsoft.App/containerApps/authConfigs@2024-03-01"
  name      = "current"
  parent_id = azurerm_container_app.this.id

  body = {
    properties = {
      platform = {
        enabled = true
      }
      globalValidation = {
        unauthenticatedClientAction = var.authentication.azure_active_directory.unauthenticated_client_action
        redirectToProvider          = "azureactivedirectory"
      }
      identityProviders = {
        azureActiveDirectory = {
          enabled = true
          registration = merge(
            {
              clientId     = var.authentication.azure_active_directory.client_id
              openIdIssuer = "https://login.microsoftonline.com/${var.authentication.azure_active_directory.tenant_id}/v2.0"
            },
            var.authentication.azure_active_directory.client_secret_key_vault_id == null ? {} : {
              clientSecretSettingName = "entra-id-client-secret"
            }
          )
        }
      }
    }
  }
}
