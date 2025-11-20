---
sidebar_position: 2
---

# Setting up Azure App Configuration and KeyVault

Azure App Configuration is a managed service that helps developers centralize
application settings, secrets and feature flags. It allows you to store
configuration data separately from your infrastructure code, making it easier to
manage and update settings when deploying a new version of your applications, or
exploiting the hot reload capabilities.

## Configuring the resource via Terraform

As the resource is quite simple to configure, you can use `azurerm` resource to
deploy an instance of the service. Below is an example showing how to configure
an instance with private connectivity and allowing authentication only via Entra
ID.

```hcl

resource "azurerm_app_configuration" "example" {
  name = provider::azuredx::resource_name(merge(
    var.naming_config,
    {
      name          = "demo",
      resource_type = "app_configuration",
    })
  )
  resource_group_name = local.resource_group_name
  location            = local.environment.location

  identity {
    type = "SystemAssigned"
  }

  sku                                  = "standard" # others are free and premium
  data_plane_proxy_authentication_mode = "Pass-through"
  local_auth_enabled                   = false

  public_network_access    = "Disabled"
  purge_protection_enabled = true

  tags = local.tags
}

data "azurerm_private_dns_zone" "appconfig" {
  name                = "privatelink.azconfig.io"
  resource_group_name = var.private_dns_zone_resource_group_name
}

resource "azurerm_private_endpoint" "app_config" {
  name                = provider::azuredx::resource_name(merge(
    var.naming_config,
    {
      name          = "demo",
      resource_type = "app_configuration_private_endpoint",
    })
  )
  location            = local.environment.location
  resource_group_name = local.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = provider::azuredx::resource_name(merge(
    var.naming_config,
    {
      name          = "demo",
      resource_type = "app_configuration_private_endpoint",
    })
  )
    private_connection_resource_id = azurerm_app_configuration.example.id
    is_manual_connection           = false
    subresource_names              = ["configurationStores"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.appconfig.id]
  }

  tags = local.tags
}

module "roles" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = module.test_app.app_service.app_service.principal_id
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
via identities between AppConfiguration and KeyVault is managed via Terraform:

```hcl

module "roles" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = azurerm_app_configuration.example.identity[0].principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  app_config = [
    {
      name                = azurerm_app_configuration.example.name
      resource_group_name = azurerm_app_configuration.example.resource_group_name
      has_rbac_support    = true # or false if KeyVault is using Access Policies
      description         = "Complete access to app configuration control plane and data"
      roles               = {
        secrets           = "Reader" # Allow AppConfiguration to read secrets from KeyVault
      }
    }
  ]
}

```
