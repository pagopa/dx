# DX - Azure Role Assignments

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-role-assignments/azurerm?label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-role-assignments%2Fazurerm%2Flatest&logo=terraform)

This module abstracts the complexity of Azure IAM roles by providing a streamlined way to assign roles to various Azure resources.

## Features

- **Resource-Specific Role Assignments**: Supports role assignments for CosmosDB, Event Hubs, Key Vaults, Redis, Storage Accounts, and APIM.
- **Customizable Roles**: Allows fine-grained control over roles and permissions for each resource type.
- **Abstracted Roles**: Simplifies role assignment by providing standardized roles ("owner", "writer", "reader") for all supported services.
- **Descriptive Assignments**: Each role assignment can include a description for better tracking and management.
- **Multi-Resource Support**: Handles multiple resources and role assignments in a single configuration.
- **RBAC Integration**: Simplifies the integration with Azure Role-Based Access Control (RBAC).
- **Scalability**: Designed to handle complex role assignment scenarios across multiple Azure services.

## Storage Submodule

For detailed documentation on storage-related role assignments (Blob, Queue, Table), see the [storage_account submodule README](modules/storage_account/README.md). This includes available roles, usage notes, and concrete examples for each storage service.

## Usage Example

For usage examples, refer to the [examples folder](https://github.com/pagopa-dx/terraform-azurerm-azure-role-assignments/tree/main/examples), which includes:

- A [Function App example](https://github.com/pagopa-dx/terraform-azurerm-azure-role-assignments/tree/main/examples/function_app) demonstrating role assignments for a Function App.
- A [Service Bus example](https://github.com/pagopa-dx/terraform-azurerm-azure-role-assignments/tree/main/examples/service_bus) demonstrating role assignments for a Service Bus.
- A [Users Assigned Identity example](https://github.com/pagopa-dx/terraform-azurerm-azure-role-assignments/tree/main/examples/users_assigned_identity) showcasing role assignments for Storage Blobs, Queues, and Tables to a user.

## Diagram
<!-- START_TF_GRAPH -->
<!-- END_TF_GRAPH -->

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.114, < 5.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_apim"></a> [apim](#module\_apim) | ./modules/apim | n/a |
| <a name="module_cosmos"></a> [cosmos](#module\_cosmos) | ./modules/cosmos | n/a |
| <a name="module_event_hub"></a> [event\_hub](#module\_event\_hub) | ./modules/event_hub | n/a |
| <a name="module_key_vault"></a> [key\_vault](#module\_key\_vault) | ./modules/key_vault | n/a |
| <a name="module_redis"></a> [redis](#module\_redis) | ./modules/redis | n/a |
| <a name="module_service_bus"></a> [service\_bus](#module\_service\_bus) | ./modules/service_bus | n/a |
| <a name="module_storage_account"></a> [storage\_account](#module\_storage\_account) | ./modules/storage_account | n/a |

## Resources

No resources.

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_apim"></a> [apim](#input\_apim) | A list of role assignments for Azure API Management (APIM) instances, specifying the APIM name, resource group, and role. | <pre>list(object({<br/>    name                = string<br/>    resource_group_name = string<br/>    role                = string<br/>    description         = string<br/>  }))</pre> | `[]` | no |
| <a name="input_cosmos"></a> [cosmos](#input\_cosmos) | A list of role assignments for Azure Cosmos DB accounts, specifying the account name, resource group, role, and optional database and collections. Defaults to all databases and collections if not specified. | <pre>list(object({<br/>    account_name        = string<br/>    resource_group_name = string<br/>    role                = string<br/>    description         = string<br/>    database            = optional(string, "*")<br/>    collections         = optional(list(string), ["*"])<br/>  }))</pre> | `[]` | no |
| <a name="input_event_hub"></a> [event\_hub](#input\_event\_hub) | A list of role assignments for Azure Event Hubs, specifying the namespace, resource group, event hub names, and role. Defaults to all event hubs if the event hub names are not specified. | <pre>list(object({<br/>    namespace_name      = string<br/>    resource_group_name = string<br/>    event_hub_names     = optional(list(string), ["*"])<br/>    role                = string<br/>    description         = string<br/>  }))</pre> | `[]` | no |
| <a name="input_key_vault"></a> [key\_vault](#input\_key\_vault) | A list of role assignments for Azure Key Vaults, including optional RBAC support and role overrides for secrets, certificates, and keys. Indicates if the Key Vault has RBAC enabled and allows overriding roles for specific functionalities. | <pre>list(object({<br/>    name                = string<br/>    resource_group_name = string<br/>    has_rbac_support    = optional(bool, null)<br/>    description         = string<br/>    roles = object({<br/>      secrets      = optional(string, "")<br/>      certificates = optional(string, "")<br/>      keys         = optional(string, "")<br/>    })<br/><br/>    override_roles = optional(object({<br/>      secrets      = optional(list(string), [])<br/>      certificates = optional(list(string), [])<br/>      keys         = optional(list(string), [])<br/>      }), {<br/>      secrets      = []<br/>      certificates = []<br/>      keys         = []<br/>    })<br/>  }))</pre> | `[]` | no |
| <a name="input_principal_id"></a> [principal\_id](#input\_principal\_id) | The ID of the principal to which assign roles. It can be a managed identity. | `string` | n/a | yes |
| <a name="input_redis"></a> [redis](#input\_redis) | A list of role assignments for Azure Redis Cache instances, specifying the cache name, resource group, role, username, and description. | <pre>list(object({<br/>    cache_name          = string<br/>    resource_group_name = string<br/>    role                = string<br/>    username            = string<br/>    description         = string<br/>  }))</pre> | `[]` | no |
| <a name="input_service_bus"></a> [service\_bus](#input\_service\_bus) | A list of role assignments for Azure Service Bus, specifying the namespace, resource group, and role.<br/>  For queues and topics, list the names. For subscriptions, pair the related topic and the subscription in a map object.<br/><br/>  Example for `subscriptions` map object:<br/>  {<br/>    topic1 = "subscription1",<br/>    topic2 = "subscription2"<br/>  } | <pre>list(object({<br/>    namespace_name      = string<br/>    resource_group_name = string<br/>    queue_names         = optional(list(string), [])<br/>    topic_names         = optional(list(string), [])<br/>    subscriptions       = optional(map(list(string)), {})<br/>    role                = string<br/>    description         = string<br/>  }))</pre> | `[]` | no |
| <a name="input_storage_blob"></a> [storage\_blob](#input\_storage\_blob) | A list of role assignments for Azure Storage Blobs, specifying the storage account, resource group, container name, and role. Defaults to all containers if the container name is not specified. | <pre>list(object({<br/>    storage_account_name          = string<br/>    resource_group_name           = string<br/>    container_name                = optional(string, "*")<br/>    container_resource_manager_id = optional(string, null)<br/>    role                          = string<br/>    description                   = string<br/>  }))</pre> | `[]` | no |
| <a name="input_storage_queue"></a> [storage\_queue](#input\_storage\_queue) | A list of role assignments for Azure Storage Queues, specifying the storage account, resource group, queue name, and role. Defaults to all queues if the queue name is not specified. | <pre>list(object({<br/>    storage_account_name      = string<br/>    resource_group_name       = string<br/>    queue_name                = optional(string, "*")<br/>    queue_resource_manager_id = optional(string, null)<br/>    role                      = string<br/>    description               = string<br/>  }))</pre> | `[]` | no |
| <a name="input_storage_table"></a> [storage\_table](#input\_storage\_table) | A list of role assignments for Azure Storage Tables, specifying the storage account, resource group, table name, and role. Defaults to all tables if the table name is not specified. | <pre>list(object({<br/>    storage_account_name      = string<br/>    resource_group_name       = string<br/>    table_name                = optional(string, "*")<br/>    table_resource_manager_id = optional(string, null)<br/>    role                      = string<br/>    description               = string<br/>  }))</pre> | `[]` | no |
| <a name="input_subscription_id"></a> [subscription\_id](#input\_subscription\_id) | The ID of the subscription where the target resources are located. | `string` | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
