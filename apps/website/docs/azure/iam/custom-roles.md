---
sidebar_position: 2
---

# Custom Azure Roles

The DX team has developed several custom Azure roles to provide granular access
control for specific scenarios that aren't covered by built-in Azure roles.
These custom roles follow the principle of least privilege, granting only the
necessary permissions for specific use cases.

## Overview

All custom roles are defined in the
[eng-azure-governance](https://github.com/pagopa/eng-azure-governance)
repository and are scoped at the PagoPA management group level. These roles are
designed to address specific operational needs while maintaining security best
practices and automation capabilities.

### Role Governance

- **Scope**: All roles are defined at the PagoPA management group level
- **Naming Convention**: `PagoPA [Service] [Permission Level/Action]`
- **Management**: Centralized in the **eng-azure-governance** repository
- **Distribution**: Available across all Azure subscriptions within the PagoPA
  organization

## Available Custom Roles

### 1. PagoPA API Management Service List Secrets

**Purpose**: Provides read-only access to API Management secrets without broader
management permissions.

**Permissions**:

- `Microsoft.ApiManagement/service/*/listSecrets/action` - List secrets for any
  APIM resource

**Use Cases**:

- **CI Pipelines**: Infrastructure validation workflows that need to read APIM
  configuration without making changes
- **Testing**: Automated tests that validate APIM secret configuration
- **Monitoring**: Tools that need to verify APIM secret presence and rotation
  compliance

**DX Module Integration**:

This role is automatically assigned in the `azure_github_environment_bootstrap`
module to:

- **Infra CI Identity** (`id_infra_ci_iam.tf`): Grants read-only access to APIM
  secrets for infrastructure validation during CI workflows
  - Scoped to the APIM resource specified via `var.apim_id`
  - Only assigned when `var.apim_id` is provided

**Definition**:
[01_apim_list_secrets.tf](https://github.com/pagopa/eng-azure-governance/blob/main/src/01_custom_roles/01_apim_list_secrets.tf)

### 2. PagoPA API Management Operator App

**Purpose**: Comprehensive role for managing API Management users, groups,
subscriptions, and secrets programmatically.

**Permissions**:

- `Microsoft.ApiManagement/service/*/read` - Read all APIM resources
- `Microsoft.ApiManagement/service/read` - Read APIM service configuration
- `Microsoft.ApiManagement/service/write` - Modify APIM service configuration
- `Microsoft.ApiManagement/service/subscriptions/write` - Create/update
  subscriptions
- `Microsoft.ApiManagement/service/workspaces/subscriptions/write` - Manage
  workspace subscriptions
- `Microsoft.ApiManagement/service/tenant/write` - Manage tenant configuration
- `Microsoft.ApiManagement/service/*/regeneratePrimaryKey/action` - Regenerate
  primary keys
- `Microsoft.ApiManagement/service/*/regenerateSecondaryKey/action` - Regenerate
  secondary keys
- `Microsoft.ApiManagement/service/*/listSecrets/action` - List secrets
- `Microsoft.ApiManagement/service/users/write` - Create/update users
- `Microsoft.ApiManagement/service/users/delete` - Delete users
- `Microsoft.ApiManagement/service/groups/write` - Create/update groups
- `Microsoft.ApiManagement/service/groups/delete` - Delete groups
- `Microsoft.ApiManagement/service/groups/users/read` - List group members
- `Microsoft.ApiManagement/service/groups/users/write` - Add/remove group
  members
- `Microsoft.ApiManagement/service/groups/users/delete` - Remove group members
- `Microsoft.ApiManagement/service/managedeployments/action` - Manage
  deployments
- `Microsoft.Resources/deployments/*` - Manage resource deployments

**Use Cases**:

- **User Management Systems**: Automated tools for managing APIM users and
  groups
- **Subscription Automation**: Tools that create and manage API subscriptions
  programmatically
- **Key Rotation**: Automated key rotation workflows for APIM subscriptions

**DX Module Integration**:

Currently not automatically assigned by DX modules. This role is intended for
application-specific identities that need to manage APIM resources
programmatically.

**Example Usage**:

```hcl
# Manual assignment for a custom application
resource "azurerm_role_assignment" "app_apim_operator" {
  scope                = <APIM Resource ID>
  role_definition_name = "PagoPA API Management Operator App"
  principal_id         = <Computing resource principal ID>
}
```

**Definition**:
[01_apim_operator_app.tf](https://github.com/pagopa/eng-azure-governance/blob/main/src/01_custom_roles/01_apim_operator_app.tf)

### 3. PagoPA Static Web Apps List Secrets

**Purpose**: Provides read-only access to Static Web App deployment tokens and
application settings.

**Permissions**:

- `Microsoft.Web/staticSites/listSecrets/action` - List deployment tokens
- `Microsoft.Web/staticSites/listAppSettings/action` - List application settings

**Use Cases**:

- **CI Workflows**: Reading deployment tokens for validation without creating
  new ones
- **CD Workflows**: Retrieving deployment tokens for deploying to Static Web
  Apps
- **Configuration Audits**: Tools that need to verify Static Web App
  configuration

**DX Module Integration**:

This role is automatically assigned in the `azure_github_environment_bootstrap`
module to:

- **App CI Identity** (`id_app_ci_iam.tf`): Grants access to read Static Web App
  secrets for build validation
  - Scoped to all resource groups in the environment
- **App CD Identity** (`id_app_cd_iam.tf`): Grants access to read deployment
  tokens for deploying to Static Web Apps
  - Scoped to all resource groups in the environment

**Definition**:
[01_static_web_app_list_secrets.tf](https://github.com/pagopa/eng-azure-governance/blob/main/src/01_custom_roles/01_static_web_app_list_secrets.tf)

### 4. PagoPA Opex Dashboards Contributor

**Purpose**: Allows creation, modification, and deletion of Azure Portal
dashboards for operational monitoring.

**Permissions**:

- `Microsoft.Portal/dashboards/write` - Create or update dashboards
- `Microsoft.Portal/dashboards/read` - Read dashboard configuration
- `Microsoft.Portal/dashboards/delete` - Delete dashboards

**Use Cases**:

- **Automated Dashboard Deployment**: Infrastructure-as-Code workflows that
  deploy monitoring dashboards
- **Dashboard Templates**: Tools that create standardized dashboards across
  environments
- **Opex Automation**: Operational excellence initiatives that programmatically
  manage dashboards

**DX Module Integration**:

This role is automatically assigned in the `azure_github_environment_bootstrap`
module to:

- **Opex CD Identity** (`id_opex_iam.tf`): Grants permission to deploy and
  manage operational dashboards
  - Scoped to the OpEx resource group specified via `var.opex_resource_group_id`
  - Used in conjunction with the Monitoring Contributor role for querying
    metrics

**Definition**:
[01_opex_contributor.tf](https://github.com/pagopa/eng-azure-governance/blob/main/src/01_custom_roles/01_opex_contributor.tf)

### 5. PagoPA Storage Blob Tags Contributor

**Purpose**: Enables management of blob tags in storage accounts without
granting access to blob data itself.

**Permissions** (Data Actions):

- `Microsoft.Storage/storageAccounts/blobServices/containers/blobs/tags/read` -
  Read blob tags
- `Microsoft.Storage/storageAccounts/blobServices/containers/blobs/tags/write` -
  Write blob tags

**Use Cases**:

- **Data Lifecycle Management**: Automated tagging for blob lifecycle policies
- **Compliance Tagging**: Tools that tag blobs with compliance metadata
- **Cost Tracking**: Systems that tag blobs for cost allocation
- **Metadata Management**: Applications that manage blob metadata without
  accessing blob content

**DX Module Integration**:

This role is automatically assigned through the `azure_role_assignments` module
when using the `storage_blob` configuration with `role = "writer"`:

**Example Usage**:

```hcl
# Using the azure_role_assignments module
module "function_roles" {
  source = "pagopa-dx/azure-role-assignments/azurerm"

  principal_id    = azurerm_linux_function_app.main.identity[0].principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  storage_blob = [
    {
      storage_account_name = azurerm_storage_account.main.name
      resource_group_name  = azurerm_resource_group.main.name
      container_name       = "uploads"
      role                 = "writer"  # This assigns both Blob Data Contributor and Tags Contributor
      description          = "Allow function to write blobs and manage tags"
    }
  ]
}
```

**Definition**:
[01_storage_blob_tags_contributor.tf](https://github.com/pagopa/eng-azure-governance/blob/main/src/01_custom_roles/01_storage_blob_tags_contributor.tf)

### 6. PagoPA Storage Queue Data Message Contributor

**Purpose**: Provides specific permissions for managing message visibility
timeouts and processing messages in storage queues, essential for
queue-triggered Azure Functions.

**Permissions** (Data Actions):

- `Microsoft.Storage/storageAccounts/queueServices/queues/messages/write` - Set
  visibility timeout of messages
- `Microsoft.Storage/storageAccounts/queueServices/queues/messages/delete` -
  Delete messages after processing
- `Microsoft.Storage/storageAccounts/queueServices/queues/messages/process/action` -
  Process queue messages

**Use Cases**:

- **Azure Functions Queue Triggers**: Functions that process messages from
  storage queues
- **Message Processing**: Applications that need to manage message visibility
  during processing
- **Queue Consumers**: Services that consume and delete messages from queues
- **Dead Letter Processing**: Tools that handle message processing failures

**DX Module Integration**:

This role is automatically assigned through the `azure_role_assignments` module
when using the `storage_queue` configuration with `role = "reader"`:

**Why This Role Is Essential for Queue Triggers**:

Azure Functions with queue triggers need to:

1. **Read messages** from the queue
2. **Update message visibility timeout** during processing to prevent duplicate
   processing
3. **Delete messages** after successful processing

The built-in "Storage Queue Data Message Processor" role only allows reading and
processing messages but does not include the write/delete permissions needed for
visibility timeout management and message deletion. This custom role fills that
gap.

**Example Usage**:

```hcl
# Using the azure_role_assignments module (recommended)
module "function_roles" {
  source = "pagopa-dx/azure-role-assignments/azurerm"

  principal_id    = azurerm_linux_function_app.main.identity[0].principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  storage_queue = [
    {
      storage_account_name = azurerm_storage_account.main.name
      resource_group_name  = azurerm_resource_group.main.name
      queue_name           = "processing-queue"
      role                 = "reader"  # Assigns processor, reader, and message contributor roles
      description          = "Allow function to process queue messages"
    }
  ]
}
```

**Definition**:
[01_storage_queue_trigger.tf](https://github.com/pagopa/eng-azure-governance/blob/main/src/01_custom_roles/01_storage_queue_trigger.tf)

## Integration with DX Modules

### `azure_github_environment_bootstrap`

This module automatically assigns custom roles to federated identities for
GitHub Actions workflows:

| Identity     | Roles Assigned                             | Purpose                           |
| ------------ | ------------------------------------------ | --------------------------------- |
| **Infra CI** | PagoPA API Management Service List Secrets | Read APIM secrets for validation  |
| **App CI**   | PagoPA Static Web Apps List Secrets        | Read Static Web App configuration |
| **App CD**   | PagoPA Static Web Apps List Secrets        | Deploy to Static Web Apps         |
| **Opex CD**  | PagoPA Opex Dashboards Contributor         | Manage operational dashboards     |

**Module Location**:
[azure-github-environment-bootstrap](https://registry.terraform.io/modules/pagopa-dx/azure-github-environment-bootstrap/azurerm/latest)

### `azure_role_assignments`

This module simplifies role assignments by providing abstracted role levels
(`owner`, `writer`, `reader`) that automatically map to the appropriate built-in
and custom roles:

**Storage Blob Writer**:

- Storage Blob Data Contributor
- **PagoPA Storage Blob Tags Contributor** ← Custom role

**Storage Queue Reader**:

- Storage Queue Data Message Processor
- Storage Queue Data Reader
- **PagoPA Storage Queue Data Message Contributor** ← Custom role

**Module Location**:
[azure-role-assignments](https://registry.terraform.io/modules/pagopa-dx/azure-role-assignments/azurerm/latest)

## Best Practices

### When to Use Custom Roles

1. **Specific Permission Needs**: When built-in roles grant too many or too few
   permissions
2. **Compliance Requirements**: When you need to enforce specific access
   patterns
3. **Automation**: When automated systems need narrow, well-defined permissions
4. **Audit Trail**: When you need clear visibility into what permissions are
   granted and why

### When to Use Built-in Roles

1. **Standard Scenarios**: When built-in roles match your needs exactly
2. **Broad Permissions**: When you need comprehensive access to a service
3. **Microsoft Support**: When following Microsoft-recommended patterns
4. **Simplicity**: When custom roles would add unnecessary complexity

### Security Guidelines

- **Least Privilege**: Always assign the minimum permissions needed for the task
- **Scope Appropriately**: Assign roles at the narrowest scope possible
  (resource > resource group > subscription)
- **Regular Review**: Periodically audit role assignments to ensure they're
  still necessary
- **Documentation**: Always include a description when assigning roles

## Contributing

To propose changes or new custom roles:

1. **Identify the Need**: Clearly document why a custom role is needed and why
   built-in roles are insufficient
2. **Follow Naming Convention**: Use the pattern
   `PagoPA [Service] [Permission Level/Action]`
3. **Minimal Permissions**: Include only the minimum permissions required
4. **Document Use Cases**: Provide clear examples of when the role should be
   used
5. **Submit to Governance**: Create a PR in the
   [eng-azure-governance](https://github.com/pagopa/eng-azure-governance)
   repository
6. **Update Documentation**: Once approved, update this documentation with
   integration examples

## Related Documentation

- [Azure IAM](./azure-iam.md) - General IAM patterns and best practices
- [azure_role_assignments Module](https://registry.terraform.io/modules/pagopa-dx/azure-role-assignments/azurerm/latest) -
  Simplified role assignment module
- [eng-azure-governance Repository](https://github.com/pagopa/eng-azure-governance) -
  Source of truth for custom roles
- [Azure Built-in Roles](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles) -
  Microsoft's built-in roles reference
