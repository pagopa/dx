---
sidebar_position: 1
---

# Setting up Azure App Configuration and KeyVault

Azure App Configuration is a managed service that helps developers centralize
application settings, secrets and feature flags. It allows you to store
configuration data separately from your infrastructure code, making it easier to
manage and update settings when deploying a new version of your applications, or
exploiting the hot reload capabilities.

## Configuring the resource via Terraform

You can use the Terraform module
[`azure_app_configuration`](https://registry.terraform.io/modules/pagopa-dx/azure-app-configuration/azurerm/latest)
to create an Azure App Configuration instance. The module usage - showed in the
example below - creates a standard
[SKU App Configuration](https://azure.microsoft.com/en-us/pricing/details/app-configuration/)
instance with private endpoint connectivity, Entra ID authentication, and
[purge protection enabled](https://learn.microsoft.com/en-us/azure/azure-app-configuration/howto-recover-deleted-stores-in-azure-app-configuration).

```hcl

module "appcs" {
  source  = "pagopa-dx/azure-app-configuration/azurerm"
  version = "~> 0.0"

  environment         = local.environment
  resource_group_name = var.resource_group_name

  subnet_pep_id = data.azurerm_subnet.pep.id

  virtual_network = {
    name                = local.virtual_network.name
    resource_group_name = local.virtual_network.resource_group_name
  }

  private_dns_zone_resource_group_name = data.azurerm_resource_group.network.name

  tags = local.tags
}

module "roles" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = module.test_app.app_service.app_service.principal_id # example application which needs to access App Configuration
  subscription_id = data.azurerm_subscription.current.subscription_id

  app_config = [
    {
      name                = azurerm_app_configuration.example.name
      resource_group_name = azurerm_app_configuration.example.resource_group_name
      description         = "Read-only access to App Configuration data for App Service"
      role                = "reader"
    }
  ]
}

```

Optionally, you can control purge options according to your needs via the
`azurerm` provider configuration:

```hcl

provider "azurerm" {
  features {
    app_configuration {
      purge_soft_delete_on_destroy = false # default
      recover_soft_deleted         = true # default
    }
  }
}

```

### Integration with KeyVault

If your application has sensitive application settings (secrets), the
AppConfiguration instance should be configured to retrieve those secrets from
Azure Key Vault, to make them available to the application. The authentication
via identities between AppConfiguration and KeyVault is managed by the module
[`azure_app_configuration`](https://registry.terraform.io/modules/pagopa-dx/azure-app-configuration/azurerm/latest),
which optionally accepts a KeyVault reference:

```hcl


module "appcs_with_kv" {
  source  = "pagopa-dx/azure-app-configuration/azurerm"
  version = "~> 0.0"

  ...

  key_vault = {
    subscription_id     = data.azurerm_subscription.current.subscription_id
    name                = azurerm_key_vault.kv.name
    resource_group_name = azurerm_key_vault.kv.resource_group_name
    has_rbac_support    = true # or false if KeyVault uses Access Policies
  }

  tags = local.tags
}

```
