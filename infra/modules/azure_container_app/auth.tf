resource "azapi_resource" "auth" {
  count = var.auth != null ? 1 : 0

  type      = "Microsoft.App/containerApps/authConfigs@2024-03-01"
  name      = "current"
  parent_id = azurerm_container_app.this.id

  body = {
    properties = {
      platform = {
        enabled = true
      }
      globalValidation = {
        unauthenticatedClientAction = "RedirectToLoginPage"
      }
      identityProviders = {
        azureActiveDirectory = {
          enabled = true
          registration = {
            clientId                = var.auth.azure_active_directory.client_id
            clientSecretSettingName = "entra-id-client-secret"
            openIdIssuer            = "https://login.microsoftonline.com/${var.auth.azure_active_directory.tenant_id}/v2.0"
          }
        }
      }
    }
  }
}
