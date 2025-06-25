# storage_account

This module provides role assignments for Azure Storage Accounts, including Blob, Queue, and Table services. It abstracts common roles into simplified terms for easier management.

## Azure Storage Queue Role Assignments

Storage Queue role assignments are designed to manage access to Azure Storage Queue services. The module allows you to assign roles at the queue level or across all queues in a storage account, making it flexible for various use cases.

### Available Roles

| Abstracted Role | Azure RBAC Role(s)                                                     | Description                                                                                             |
| --------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `reader`        | • Storage Queue Data Message Processor<br/>• Storage Queue Data Reader | Allows reading queue messages and metadata. Can process (receive and delete) messages from queues.      |
| `writer`        | • Storage Queue Data Message Sender                                    | Allows sending messages to queues.                                                                      |
| `owner`         | • Storage Queue Data Contributor                                       | Full access to queue data including create, read, update, and delete operations on queues and messages. |

### Usage Notes

- **Queue Scope**: You can assign roles to specific queues by providing the `queue_name`, or to all queues in a storage account by using the default value `"*"`.
- **Resource Manager ID**: Optionally specify `queue_resource_manager_id` for explicit resource targeting.
- **Multiple Roles**: The `reader` role automatically assigns both "Storage Queue Data Message Processor" and "Storage Queue Data Reader" roles to provide comprehensive read access.

### Example

```hcl
module "role_assignments" {
  source = "path/to/azure_role_assignments"

  principal_id    = "your-principal-id"
  subscription_id = "your-subscription-id"

  storage_queue = [
    {
      storage_account_name = "mystorageaccount"
      resource_group_name  = "my-resource-group"
      queue_name          = "my-specific-queue"  # or "*" for all queues
      role                = "reader"             # reader, writer, or owner
      description         = "Queue access for my application"
    }
  ]
}
```

## Azure Storage Blob Role Assignments

Storage Blob role assignments are designed to manage access to Azure Storage Blob services. The module allows you to assign roles at the container level or across all containers in a storage account, making it flexible for various use cases.

### Available Roles

| Abstracted Role | Azure RBAC Role(s)              | Description                                                                                           |
| --------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `reader`        | • Storage Blob Data Reader      | Allows reading blob data and metadata, including listing containers and blobs.                        |
| `writer`        | • Storage Blob Data Contributor | Allows read, write, and delete access to blob data, including creating and managing containers.       |
| `owner`         | • Storage Blob Data Owner       | Full access to blob data including all permissions to blobs and containers, and POSIX access control. |

### Usage Notes

- **Container Scope**: You can assign roles to specific containers by providing the `container_name`, or to all containers in a storage account by using the default value `"*"`.
- **Hierarchical Access**: Blob storage roles provide hierarchical access control, with `owner` having the most permissions.
- **Data Plane Access**: These roles provide data plane access to blob storage, not management plane operations.

### Example

```hcl
module "role_assignments" {
  source = "path/to/azure_role_assignments"

  principal_id    = "your-principal-id"
  subscription_id = "your-subscription-id"

  storage_blob = [
    {
      storage_account_name = "mystorageaccount"
      resource_group_name  = "my-resource-group"
      container_name      = "my-container"      # or "*" for all containers
      role                = "writer"            # reader, writer, or owner
      description         = "Blob access for my application"
    }
  ]
}
```

## Azure Storage Table Role Assignments

Storage Table role assignments are designed to manage access to Azure Storage Table services. The module allows you to assign roles at the table level or across all tables in a storage account, making it flexible for various use cases.

### Available Roles

| Abstracted Role | Azure RBAC Role(s)               | Description                                                                                             |
| --------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `reader`        | • Storage Table Data Reader      | Allows reading table data and metadata, including listing tables and entities.                          |
| `writer`        | • Storage Table Data Contributor | Allows read, write, and delete access to table data, including creating and managing tables.            |
| `owner`         | • Storage Table Data Contributor | Full access to table data including create, read, update, and delete operations on tables and entities. |

### Usage Notes

- **Table Scope**: You can assign roles to specific tables by providing the `table_name`, or to all tables in a storage account by using the default value `"*"`.
- **Entity Operations**: These roles control access to table entities and table-level operations.
- **NoSQL Access**: Table storage roles provide access to Azure's NoSQL table service for structured data storage.

### Example

```hcl
module "role_assignments" {
  source = "path/to/azure_role_assignments"

  principal_id    = "your-principal-id"
  subscription_id = "your-subscription-id"

  storage_table = [
    {
      storage_account_name = "mystorageaccount"
      resource_group_name  = "my-resource-group"
      table_name          = "my-table"          # or "*" for all tables
      role                = "reader"            # reader, writer, or owner
      description         = "Table access for my application"
    }
  ]
}
```

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.114, < 5.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_role_assignment.blob](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.queue](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.table](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_principal_id"></a> [principal\_id](#input\_principal\_id) | The ID of the principal to which assign roles. It can be a managed identity. | `string` | n/a | yes |
| <a name="input_storage_blob"></a> [storage\_blob](#input\_storage\_blob) | A list of storage blob role assignments | <pre>list(object({<br/>    storage_account_name = string<br/>    resource_group_name  = string<br/>    container_name       = optional(string, "*")<br/>    role                 = string<br/>    description          = string<br/>  }))</pre> | `[]` | no |
| <a name="input_storage_queue"></a> [storage\_queue](#input\_storage\_queue) | A list of storage queue role assignments | <pre>list(object({<br/>    storage_account_name = string<br/>    resource_group_name  = string<br/>    queue_name           = optional(string, "*")<br/>    role                 = string<br/>    description          = string<br/>  }))</pre> | `[]` | no |
| <a name="input_storage_table"></a> [storage\_table](#input\_storage\_table) | A list of storage table role assignments | <pre>list(object({<br/>    storage_account_name = string<br/>    resource_group_name  = string<br/>    table_name           = optional(string, "*")<br/>    role                 = string<br/>    description          = string<br/>  }))</pre> | `[]` | no |
| <a name="input_subscription_id"></a> [subscription\_id](#input\_subscription\_id) | The ID of the subscription where the target resources are located | `string` | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
