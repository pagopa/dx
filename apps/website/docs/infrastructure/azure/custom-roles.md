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
practices.

## Available Custom Roles

### 1. PagoPA API Management Service List Secrets

**Purpose**: Provides read-only access to API Management secrets without broader
management permissions.

**Use Case**: CI/CD pipelines and automated processes that need to retrieve
secrets from APIM without having full management access.

**Permissions**:

- `Microsoft.ApiManagement/service/*/listSecrets/action`

**Definition**:
[01_apim_list_secrets.tf](https://github.com/pagopa/eng-azure-governance/blob/main/src/01_custom_roles/01_apim_list_secrets.tf)

---

### 2. PagoPA API Management Operator App

**Purpose**: Comprehensive role for managing API Management users, groups,
subscriptions, and secrets.

**Use Case**: Applications and services that need to manage APIM resources
programmatically, such as user management systems or deployment pipelines.

**Key Permissions**:

- Read/write access to APIM services
- Subscription management
- Secret and key operations (list, regenerate)
- User and group management
- Deployment management

**Definition**:
[01_apim_operator_app.tf](https://github.com/pagopa/eng-azure-governance/blob/main/src/01_custom_roles/01_apim_operator_app.tf)

---

### 3. PagoPA Opex Dashboards Contributor

**Purpose**: Allows creation, modification, and deletion of Azure Portal
dashboards for operational monitoring.

**Use Case**: Automated dashboard deployment and management for operational
excellence (OpEx) initiatives.

**Permissions**:

- `Microsoft.Portal/dashboards/write`
- `Microsoft.Portal/dashboards/read`
- `Microsoft.Portal/dashboards/delete`

**Definition**:
[01_opex_contributor.tf](https://github.com/pagopa/eng-azure-governance/blob/main/src/01_custom_roles/01_opex_contributor.tf)

---

### 4. PagoPA Storage Blob Tags Contributor

**Purpose**: Enables management of blob tags in storage accounts without broader
blob data access.

**Use Case**: Data lifecycle management, automated tagging systems, and metadata
management processes.

**Permissions**:

- `Microsoft.Storage/storageAccounts/blobServices/containers/blobs/tags/read`
- `Microsoft.Storage/storageAccounts/blobServices/containers/blobs/tags/write`

**Definition**:
[01_storage_blob_tags_contributor.tf](https://github.com/pagopa/eng-azure-governance/blob/main/src/01_custom_roles/01_storage_blob_tags_contributor.tf)

---

### 5. PagoPA Storage Queue Data Message Contributor

**Purpose**: Provides specific permissions for managing message visibility
timeouts and processing messages in storage queues.

**Use Case**: Azure Functions with queue triggers that need to manage message
processing without full queue data access.

**Permissions**:

- `Microsoft.Storage/storageAccounts/queueServices/queues/messages/write`
- `Microsoft.Storage/storageAccounts/queueServices/queues/messages/delete`
- `Microsoft.Storage/storageAccounts/queueServices/queues/messages/process/action`

**Definition**:
[01_storage_queue_trigger.tf](https://github.com/pagopa/eng-azure-governance/blob/main/src/01_custom_roles/01_storage_queue_trigger.tf)

## Role Assignment in DX Modules

These custom roles are automatically assigned in various DX infrastructure
modules:

- **API Management roles** are used in CI/CD identities for APIM management
- **Storage roles** are assigned to Function Apps for queue processing and blob
  tagging
- **Opex roles** are used for automated dashboard management workflows

## Security Considerations

- All roles follow the principle of least privilege
- Each role has a specific, well-defined purpose
- Regular review and updates are performed as part of the governance process

## Contributing

To propose changes or new custom roles:

1. Review the existing roles in the
   [eng-azure-governance](https://github.com/pagopa/eng-azure-governance)
   repository
2. Follow the established naming convention:
   `PagoPA [Service] [Permission Level]`
3. Document the specific use case and required permissions
4. Submit a pull request with the role definition and justification

## Related Documentation

- [Azure IAM](./azure-iam.md) - General IAM patterns and best practices
