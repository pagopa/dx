---
sidebar_position: 5
---

# How to Set Up Azure Static Web App for CI/CD Workflow

This guide explains how to create an **Azure Static Web App** resource, using
Terraform to enable automated deployments via the
[Build and Deploy Static Site to Azure Static Web App Workflow](../pipelines/build-deploy-static-web-app.md).

## Create Azure Static Web App with Terraform

You can provision the resource using the official
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

## Connecting the Resource to the Workflow

Once the Static Web App is created, configure your CI/CD workflow as described
in
[Build and Deploy Static Site to Azure Static Web App](../pipelines/build-deploy-static-web-app.md):

- Set `static_web_app_name` and `resource_group_name` in the workflow inputs to
  match your Azure resource.
- Ensure required secrets and permissions are available for deployment.

## Additional Notes

- The GitHub enviroment must have the following roles assigned:
  - `Contributor`
  - `Website Contributor`

- For more details, refer to the
  [Terraform documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/static_web_app)
  and
  [Azure Static Web Apps documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/).
