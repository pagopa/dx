# DX - Azure Role Assignments

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-role-assignments/azurerm?label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-role-assignments%2Fazurerm%2Flatest&logo=terraform)

This module abstracts the complexity of Azure IAM roles by providing a streamlined, developer-friendly way to assign permissions to various Azure resources.

Instead of memorizing dozens of Azure Built-in Role names (like _"Storage Blob Data Contributor"_ or _"Cosmos DB Built-in Data Reader"_), this module allows you to simply request `"reader"`, `"writer"`, or `"owner"` for a specific resource, and it handles the exact mapping under the hood.

## 🌟 Features

- **Standardized Abstraction**: Exposes only three generic roles (`"reader"`, `"writer"`, `"owner"`) across all supported services.
- **Granular Scoping**: Assign roles at the account/namespace level, or drill down to specific queues, topics, containers, or collections.
- **Multi-Resource Batching**: Pass lists of assignments for different services simultaneously to a single principal.
- **Supported Resources**: Cosmos DB, Redis, Key Vault, Storage (Table, Blob, Queue), Event Hub, Service Bus, API Management, App Configuration.
- **Observability via description**: Each assignment requires a `description` to provide context on why the permission is needed, improving auditability and maintainability.

## 🚀 Quick Usage Example

Assign multiple roles to a managed identity (e.g., an App Service) using our simplified abstraction:

```hcl
module "role_assignments" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.0" # Always check for the latest version

  principal_id    = azurerm_user_assigned_identity.app_identity.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  # Give write access to a specific Blob Container
  storage_blob = [
    {
      storage_account_name = "mystorageacct"
      resource_group_name  = "rg-storage"
      container_name       = "documents"
      role                 = "writer"
      description          = "Allow web app to write documents"
    }
  ]

  # Give read/write access to Key Vault secrets, but no access to keys
  key_vault = [
    {
      name                = "mykeyvault"
      resource_group_name = "rg-security"
      description         = "Allow web app to read configuration secrets and write certificates"
      roles = {
        secrets      = "reader"
        certificates = "writer"
      }
    }
  ]
}
```

## Usage Examples

For usage examples, refer to the [examples folder](https://github.com/pagopa-dx/terraform-azurerm-azure-role-assignments/tree/main/examples), which includes:

- A [Function App example](https://github.com/pagopa-dx/terraform-azurerm-azure-role-assignments/tree/main/examples/function_app) demonstrating role assignments for a Function App.
- A [Service Bus example](https://github.com/pagopa-dx/terraform-azurerm-azure-role-assignments/tree/main/examples/service_bus) demonstrating role assignments for a Service Bus.
- A [Users Assigned Identity example](https://github.com/pagopa-dx/terraform-azurerm-azure-role-assignments/tree/main/examples/users_assigned_identity) showcasing role assignments for Storage Blobs, Queues, and Tables to a user.

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.114, < 5.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_apim"></a> [apim](#module\_apim) | ./modules/apim | n/a |
| <a name="module_app_config"></a> [app\_config](#module\_app\_config) | ./modules/app_config | n/a |
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
| <a name="input_apim"></a> [apim](#input\_apim) | List of role assignments for Azure API Management (APIM) instances.<br/><br/>REQUIRED FIELDS:<br/>- name: Name of the API Management instance<br/>- resource\_group\_name: Resource group containing the APIM instance<br/>- role: Permission level - MUST be one of: "reader", "writer", "owner"<br/>- description: Human-readable description of the role assignment purpose | <pre>list(object({<br/>    name                = string<br/>    resource_group_name = string<br/>    role                = string<br/>    description         = string<br/>  }))</pre> | `[]` | no |
| <a name="input_app_config"></a> [app\_config](#input\_app\_config) | List of role assignments for Azure App Configuration stores.<br/><br/>REQUIRED FIELDS:<br/>- name: Name of the App Configuration store<br/>- resource\_group\_name: Resource group containing the App Configuration store<br/>- role: Permission level - MUST be one of: "reader", "writer", "owner"<br/>- description: Human-readable description of the role assignment purpose | <pre>list(object({<br/>    name                = string<br/>    resource_group_name = string<br/>    role                = string<br/>    description         = string<br/>  }))</pre> | `[]` | no |
| <a name="input_cosmos"></a> [cosmos](#input\_cosmos) | List of role assignments for Azure Cosmos DB accounts.<br/><br/>REQUIRED FIELDS:<br/>- account\_name: Name of the Cosmos DB account<br/>- resource\_group\_name: Resource group containing the account<br/>- role: Permission level - MUST be one of: "reader", "writer", "owner"<br/>- description: Human-readable description of the role assignment purpose<br/><br/>OPTIONAL FIELDS:<br/>- database: Database name (default: "*" for all databases)<br/>- collections: List of collection names (default: ["*"] for all collections) | <pre>list(object({<br/>    account_name        = string<br/>    resource_group_name = string<br/>    role                = string<br/>    description         = string<br/>    database            = optional(string, "*")<br/>    collections         = optional(list(string), ["*"])<br/>  }))</pre> | `[]` | no |
| <a name="input_event_hub"></a> [event\_hub](#input\_event\_hub) | List of role assignments for Azure Event Hubs.<br/><br/>REQUIRED FIELDS:<br/>- namespace\_name: Name of the Event Hubs namespace<br/>- resource\_group\_name: Resource group containing the namespace<br/>- role: Permission level - MUST be one of: "reader", "writer", "owner"<br/>- description: Human-readable description of the role assignment purpose<br/><br/>OPTIONAL FIELDS:<br/>- event\_hub\_names: List of specific Event Hub names within the namespace (default: ["*"] for all Event Hubs) | <pre>list(object({<br/>    namespace_name      = string<br/>    resource_group_name = string<br/>    event_hub_names     = optional(list(string), ["*"])<br/>    role                = string<br/>    description         = string<br/>  }))</pre> | `[]` | no |
| <a name="input_key_vault"></a> [key\_vault](#input\_key\_vault) | List of role assignments for Azure Key Vault instances.<br/><br/>REQUIRED FIELDS:<br/>- name: Name of the Key Vault<br/>- resource\_group\_name: Resource group containing the Key Vault<br/>- description: Human-readable description of the role assignment purpose<br/>- roles: Object specifying base permissions for each Key Vault functionality:<br/>  - secrets: Role for secrets - MUST be one of: "reader", "writer", "owner", or not set (empty for no access)<br/>  - certificates: Role for certificates - MUST be one of: "reader", "writer", "owner", or not set (empty for no access)<br/>  - keys: Role for keys - MUST be one of: "reader", "writer", "owner", or not set (empty for no access)<br/><br/>OPTIONAL FIELDS:<br/>- has\_rbac\_support: Set to true if Key Vault uses Azure RBAC for authorization (default: true, access policies will be created for vaults without RBAC support otherwise, role assignments for vaults with RBAC support)<br/>- override\_roles: Advanced - list of Access Policies permissions to override module-defined ones. Has no effect when has\_rbac\_support is true. | <pre>list(object({<br/>    name                = string<br/>    resource_group_name = string<br/>    has_rbac_support    = optional(bool, null)<br/>    description         = string<br/>    roles = object({<br/>      secrets      = optional(string, "")<br/>      certificates = optional(string, "")<br/>      keys         = optional(string, "")<br/>    })<br/><br/>    override_roles = optional(object({<br/>      secrets      = optional(list(string), [])<br/>      certificates = optional(list(string), [])<br/>      keys         = optional(list(string), [])<br/>      }), {<br/>      secrets      = []<br/>      certificates = []<br/>      keys         = []<br/>    })<br/>  }))</pre> | `[]` | no |
| <a name="input_principal_id"></a> [principal\_id](#input\_principal\_id) | The ID of the principal (user, group, service principal, or managed identity) to which roles will be assigned.<br/>  For managed identities, use the principal\_id output from the identity resource. | `string` | n/a | yes |
| <a name="input_redis"></a> [redis](#input\_redis) | List of role assignments for Azure Cache for Redis instances.<br/><br/>REQUIRED FIELDS:<br/>- cache\_name: Name of the Redis cache instance<br/>- resource\_group\_name: Resource group containing the cache<br/>- role: Permission level - MUST be one of: "reader", "writer", "owner"<br/>- username: Redis username for the access policy (used in Redis ACLs)<br/>- description: Human-readable description of the role assignment purpose | <pre>list(object({<br/>    cache_name          = string<br/>    resource_group_name = string<br/>    role                = string<br/>    username            = string<br/>    description         = string<br/>  }))</pre> | `[]` | no |
| <a name="input_service_bus"></a> [service\_bus](#input\_service\_bus) | List of role assignments for Azure Service Bus.<br/><br/>REQUIRED FIELDS:<br/>- namespace\_name: Name of the Service Bus namespace<br/>- resource\_group\_name: Resource group containing the namespace<br/>- role: Permission level - MUST be one of: "reader", "writer", "owner"<br/>- description: Human-readable description of the role assignment purpose<br/><br/>OPTIONAL FIELDS:<br/>- queue\_names: List of specific queue names (default: [] for namespace-level access only)<br/>- topic\_names: List of specific topic names (default: [] for namespace-level access only)<br/>- subscriptions: Map of topic names to lists of subscription names. Each key is a topic name, each value is a list of subscription names under that topic. | <pre>list(object({<br/>    namespace_name      = string<br/>    resource_group_name = string<br/>    queue_names         = optional(list(string), [])<br/>    topic_names         = optional(list(string), [])<br/>    subscriptions       = optional(map(list(string)), {})<br/>    role                = string<br/>    description         = string<br/>  }))</pre> | `[]` | no |
| <a name="input_storage_blob"></a> [storage\_blob](#input\_storage\_blob) | List of role assignments for Azure Storage Blob containers.<br/><br/>REQUIRED FIELDS:<br/>- storage\_account\_name: Name of the Storage Account<br/>- resource\_group\_name: Resource group containing the Storage Account<br/>- role: Permission level - MUST be one of: "reader", "writer", "owner"<br/>- description: Human-readable description of the role assignment purpose<br/><br/>OPTIONAL FIELDS:<br/>- container\_name: Specific container name (default: "*" for all containers)<br/>- container\_resource\_manager\_id: Azure Resource Manager ID of a specific container (alternative to container\_name for granular scope) | <pre>list(object({<br/>    storage_account_name          = string<br/>    resource_group_name           = string<br/>    container_name                = optional(string, "*")<br/>    container_resource_manager_id = optional(string, null)<br/>    role                          = string<br/>    description                   = string<br/>  }))</pre> | `[]` | no |
| <a name="input_storage_queue"></a> [storage\_queue](#input\_storage\_queue) | List of role assignments for Azure Storage Queues.<br/><br/>REQUIRED FIELDS:<br/>- storage\_account\_name: Name of the Storage Account<br/>- resource\_group\_name: Resource group containing the Storage Account<br/>- role: Permission level - MUST be one of: "reader", "writer", "owner"<br/>- description: Human-readable description of the role assignment purpose<br/><br/>OPTIONAL FIELDS:<br/>- queue\_name: Specific queue name (default: "*" for all queues)<br/>- queue\_resource\_manager\_id: Azure Resource Manager ID of a specific queue (alternative to queue\_name for granular scope) | <pre>list(object({<br/>    storage_account_name      = string<br/>    resource_group_name       = string<br/>    queue_name                = optional(string, "*")<br/>    queue_resource_manager_id = optional(string, null)<br/>    role                      = string<br/>    description               = string<br/>  }))</pre> | `[]` | no |
| <a name="input_storage_table"></a> [storage\_table](#input\_storage\_table) | List of role assignments for Azure Storage Tables.<br/><br/>REQUIRED FIELDS:<br/>- storage\_account\_name: Name of the Storage Account<br/>- resource\_group\_name: Resource group containing the Storage Account<br/>- role: Permission level - MUST be one of: "reader", "writer", "owner"<br/>- description: Human-readable description of the role assignment purpose<br/><br/>OPTIONAL FIELDS:<br/>- table\_name: Specific table name (default: "*" for all tables)<br/>- table\_resource\_manager\_id: Azure Resource Manager ID of a specific table (alternative to table\_name for granular scope) | <pre>list(object({<br/>    storage_account_name      = string<br/>    resource_group_name       = string<br/>    table_name                = optional(string, "*")<br/>    table_resource_manager_id = optional(string, null)<br/>    role                      = string<br/>    description               = string<br/>  }))</pre> | `[]` | no |
| <a name="input_subscription_id"></a> [subscription\_id](#input\_subscription\_id) | The ID of the subscription where the target resources are located. | `string` | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
