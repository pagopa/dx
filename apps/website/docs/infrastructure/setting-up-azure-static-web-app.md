---
sidebar_position: 51
---

# How to Set Up Azure Static Web App for CI/CD Workflow

This guide explains how to manually create an **Azure Static Web App** resource,
either using Terraform or directly from the Azure Portal, to enable automated
deployments via the
[Build and Deploy Static Site to Azure Static Web App Workflow](../pipelines/build-deploy-static-web-app.md).

## Option 1: Create Azure Static Web App with Terraform

You can provision the needed cloud services using the official
[azurerm_static_web_app](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/static_web_app)
Terraform resource.

### Example Terraform Configuration

```hcl
resource "azurerm_static_web_app" "example" {
  name                = "your-static-web-app-name"
  resource_group_name = "your-resource-group-name"
  location            = "westeurope" # Is a required parameter, but doesn't affect deployments because the service is global
  sku_tier            = "Standard" # Choose Free for testing, Standard for production

  tags = {
    ...
  }
}
```

- Adjust `name`, `resource_group_name`, and other fields as needed.
- Run `terraform apply` to create the resource.
- After creation, note the resource name and resource group for workflow
  configuration.

## Option 2: Create Azure Static Web App from Portal

1. Go to [Azure Portal](https://portal.azure.com/).
2. Search for **Static Web Apps** and click **Create**.
3. Fill in the required fields:
   - **Resource Group**: Select or create one.
   - **Name**: Choose a unique name for your app.
   - **Plan Type**: Choose the appropriate tier, for testing use Free, for
     production use Standard.
4. In Deployment details, you can skip connecting to a repository since the
   CI/CD workflow will handle deployments, so choose `Other`.
5. In **Deploymment configuration** tab select `Deployment token`.
6. In the **Advanced** tab change the Region with the closer one.

:::note

For traceabiility purpose is highly recommended to use `Terraform`
configuration, while the Azure Portal one should be used only for testing or
demo purposes.

:::

## Connecting the Resource to the Workflow

Once the Static Web App is created, configure your CI/CD workflow as described
in
[Build and Deploy Static Site to Azure Static Web App](../pipelines/build-deploy-static-web-app.md):

- Set `static_web_app_name` and `resource_group_name` in the workflow inputs to
  match your Azure resource.
- Ensure required secrets and permissions are available for deployment.

## Additional Notes

- Managed Identity permissions for correct deployment:
  - `Contributor`
  - `Website Contributor`

- For more details, refer to the
  [Terraform documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/static_web_app)
  and
  [Azure Static Web Apps documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/).
