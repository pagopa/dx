# Expose Key Vault secrets to Azure Container Apps without putting secret values in Terraform.
# Use the DX module shape when available; adapt names and module inputs to the project.

module "container_app" {
  source  = "pagopa-dx/azure-container-app/azurerm"
  version = "~> <MAJOR.MINOR>"

  containers = [
    {
      image = var.image
      environment_variables = [
        {
          name  = "FEATURE_FLAG"
          value = "enabled"
        },
        {
          name  = "DATABASE_PASSWORD"
          value = azurerm_key_vault_secret.database_password.versionless_id
        }
      ]

      liveness_probe = {
        path = "/health"
      }
    }
  ]

  depends_on = [module.container_app_key_vault_reader]
}
