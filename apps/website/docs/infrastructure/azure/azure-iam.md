# Managing Azure IAM Roles and Permissions

## Overview

Understanding Azure Identity and Access Management (IAM) roles and permissions
is crucial for developer teams to securely and efficiently manage access to
cloud resources while maintaining the least privilege principles.

In order to ensure a clear separation of concerns and resource ownership, as DX
team, we have defined a set of guidelines and best practices for managing IAM
roles and permissions in Azure.

## Roles and Permissions

We propose a role-based access control (RBAC) model that leverages Azure Entra
ID groups to manage access to Azure resources. Each team will have three Entra
ID security groups:

- Admins (domain experts)
- Developers (regular team members)
- Externals (contractors)

This segmentation allows for appropriate access levels based on role
responsibilities and trust levels. Each team is responsible and autonomous on
how to split members among these groups by making PRs on
[eng-azure-authorization](https://github.com/pagopa/eng-azure-authorization/tree/main/src/azure-subscriptions/subscriptions)
repository.

This section outlines the IAM configuration for each Entra ID group.

### Subscription-Level Access

#### Admin Group

- `Contributor` role on the subscription: can view and manage all resources
- Can assist in emergency situations and manage cross-team resources

#### Developer Group

- `Reader` role on the subscription: can view all resources but cannot modify
  them
- Provides an overview of the broader infrastructure context

#### External Group

- `Reader` role on the subscription (same as Developer group)
- Can understand the system architecture while maintaining security

### Resource Group-Level Access

#### Team-Specific Resource Groups

While subscriptions may be shared across teams, resource groups are owned and
managed by a single team.

##### Admin Group

- `Owner` role: full control over all resources within the group
- Can manage IAM assignments within the group
- Can manage resource locks
- In Key Vaults using RBAC:
  - `Key Vault Data Access Administrator` role: can manage secrets, keys and
    certificates
  - `Key Vault Administrator` role: can manage resource properties

##### Developer Group

- `Contributor` role: can create and manage resources
- Cannot modify IAM assignments
- Cannot modify resource locks
- In Key Vaults using RBAC:
  - `Key Vault Secrets Officer` role: can manage secrets

##### External Group

- `Reader` (inherited) role: can view resources and configurations
- No modification privileges

#### Shared Resources-Level Access

Some resources are inherently shared across teams due to their nature or
architectural decisions. These include (but are not limited to):

- Application Gateways
- API Management
- Public and Private DNS Zones
- Private Endpoints
- Other product-specific resources

For shared resources, teams must request role assignments through Pull Requests
to the repository where they are defined (generally `<product-name>-infra`).
This process is useful to control access and management of critical resources
with big radius impact.

## Role-Based Access Matrix

The following roles are set up automatically by the Terraform module
`azure_github_environment_bootstrap`. Its usage is strong advised for mono
repositories. The first view is cleaner and easier to read, recommended for
developers.

<details>
  <summary>Simplified view</summary>

|                   | **Product Subscription** | **Product Private Endpoints** | **Product Private DNS Zone** | **Product NAT Gateway** | **Product APIM** |           **Team Resource Groups**           | **Opex Resource Group** |
| :---------------: | :----------------------: | :---------------------------: | :--------------------------: | :---------------------: | :--------------: | :------------------------------------------: | :---------------------: |
| **Entra ID Adm**  |          Writer          |            Writer             |            Writer            |         Writer          |      Writer      |     Writer - Lock manager - IAM manager      |         Writer          |
| **Entra ID Devs** |          Reader          |            Writer             |            Reader            |         Reader          |      Reader      |  Writer - No access to Certificate and Keys  |         Reader          |
| **Entra ID Ext**  |          Reader          |            Writer             |            Reader            |         Reader          |      Reader      |                    Reader                    |         Reader          |
|     \*\*\*\*      |                          |                               |                              |                         |                  |                                              |                         |
|  **ID Infra CI**  |          Reader          |            Reader             |            Reader            |         Reader          |   List secrets   |                    Reader                    |         Reader          |
|  **ID Infra CD**  |   Reader - IAM Manager   |            Writer             |            Writer            |         Writer          |      Writer      | Writer - IAM Manager - Manage resource locks |  Reader - IAM Manager   |
|   **ID App CD**   |          Reader          |            Writer             |            Writer            |         Writer          |      Writer      |          Writer (AppService & CDN)           |         Reader          |
|  **ID Opex CI**   |          Reader          |            Reader             |            Reader            |         Reader          |      Reader      |                    Reader                    |         Reader          |
|  **ID Opex CD**   |          Reader          |            Reader             |            Reader            |         Reader          |      Reader      |                    Reader                    |         Writer          |

</details>
<br/>

This view is instead recommended for cloud operators.

<details>
  <summary>Detailed view</summary>

|                   |                               **Product Subscription**                               |                                  **Product Private Endpoints**                                   |                                   **Product Private DNS Zone**                                   |                                     **Product NAT Gateway**                                      |              **Product APIM**               |                                                                    **Team Resource Groups**                                                                    |                                           **Opex Resource Group**                                           |
| :---------------: | :----------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------: | :-----------------------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------: |
| **Entra ID Adm**  |                                     Contributor                                      |                                     (inherited Contributor)                                      |                                     (inherited Contributor)                                      |                                     (inherited Contributor)                                      |           (inherited Contributor)           |                                             Owner - Key Vault Data Access Administrator - Key Vault Administrator                                              |                                           (inherited Contributor)                                           |
| **Entra ID Devs** |                                        Reader                                        |                                        (inherited Reader)                                        |                                        (inherited Reader)                                        |                                        (inherited Reader)                                        |             (inherited Reader)              |                                                            Contributor - Key Vault Secrets Officer                                                             |                                             (inherited Reader)                                              |
| **Entra ID Ext**  |                                        Reader                                        |                                        (inherited Reader)                                        |                                        (inherited Reader)                                        |                                        (inherited Reader)                                        |             (inherited Reader)              |                                                                             Reader                                                                             |                                             (inherited Reader)                                              |
|     \*\*\*\*      |                                                                                      |                                                                                                  |                                                                                                  |                                                                                                  |                                             |                                                                                                                                                                |                                                                                                             |
|  **ID Infra CI**  | Reader - Reader and Data Access - PagoPA Iac Reader - DocumentDB Account Contributor | (inherited Reader - Reader and Data Access - PagoPA Iac Reader - DocumentDB Account Contributor) | (inherited Reader - Reader and Data Access - PagoPA Iac Reader - DocumentDB Account Contributor) | (inherited Reader - Reader and Data Access - PagoPA Iac Reader - DocumentDB Account Contributor) | PagoPA API Management Service List Secrets  | Key Vault Secrets User - Key Vault Certificate User - Key Vault Crypto User - Storage Blob Data Reader - Storage Queue Data Reader - Storage Table Data Reader |      (inherited Reader - Reader and Data Access - PagoPA Iac Reader - DocumentDB Account Contributor)       |
|  **ID Infra CD**  |                   Reader - Role Based Access Control Administrator                   |                                       Network Contributor                                        |                                   Private DNS Zone Contributor                                   |                                       Network Contributor                                        |     API Management Service Contributor      |                              Contributor - Key Vault Secrets Officer - Key Vault Certificates Officer - Key Vault Crypto Officer                               |                        (inherited Reader - Role Based Access Control Administrator)                         |
|   **ID App CD**   |                                        Reader                                        |                                        (inherited Reader)                                        |                                        (inherited Reader)                                        |                                        (inherited Reader)                                        |             (inherited Reader)              |                                                                       (inherited Reader)                                                                       | Website Contributor - Storage Blob Data Contributor - CDN Endpoint Contributor - Container Apps Contributor |
|  **ID Opex CI**   |                           Reader - Reader and Data Access                            |                           (inherited Reader - Reader and Data Access)                            |                           (inherited Reader - Reader and Data Access)                            |                           (inherited Reader - Reader and Data Access)                            | (inherited Reader - Reader and Data Access) |                                                          (inherited Reader - Reader and Data Access)                                                           |                                 (inherited Reader - Reader and Data Access)                                 |
|  **ID Opex CD**   |                                        Reader                                        |                           (inherited Reader - Reader and Data Access)                            |                           (inherited Reader - Reader and Data Access)                            |                           (inherited Reader - Reader and Data Access)                            | (inherited Reader - Reader and Data Access) |                                                          (inherited Reader - Reader and Data Access)                                                           |                         Monitoring Contributor - PagoPA Opex Dashboards Contributor                         |

</details>

### Roles explanation

| Role                                      | Description                                                                                                    |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `Reader`                                  | Resource control plane read-only access                                                                        |
| `Reader and Data Access`                  | Resource data plane read access. Allows writing on Storage Account using keys as authentication system         |
| `PagoPA IaC Reader`                       | List keys and credentials for IaC access                                                                       |
| `DocumentDB Account Contributor`          | CosmosDB control plane access                                                                                  |
| `Key Vault Data Access Administrator`     | Manage access to Azure Key Vault                                                                               |
| `Key Vault Administrator`                 | Includes data plane operations on a key vault and all objects in it, including certificates, keys, and secrets |
| `Key Vault Secrets Officer`               | Perform any action on the secrets of a key vault, except managing permissions                                  |
| `Role Based Access Control Administrator` | Manage access to Azure resources by assigning roles using Azure RBAC                                           |
| `User Access Administrator`               | Lets you manage user access to Azure resources, including locks                                                |
| `Network Contributor`                     | Lets you manage networks, but not access to them                                                               |
| `Private DNS Zone Contributor`            | Lets you manage private DNS zone resources, but not the virtual networks they are linked to                    |
| `API Management Service Contributor`      | Can manage the service and the APIs                                                                            |
| `Storage Blob Data Contributor`           | Read, write, and delete Azure Storage containers and blobs                                                     |
| `Storage Queue Data Contributor`          | Read, write, and delete Azure Storage queues and queue messages                                                |
| `Storage Table Data Contributor`          | Allows for read, write, and delete access to Azure Storage tables and entities                                 |

## Code Examples (How-To) and Common Troubleshooting

### How to label a resource group as team-owned

Create the resource group in `Repository` Terraform configuration of your mono
repository and pass its resource id to the `azure_github_environment_bootstrap`
module via the `additional_resource_group_ids` variable. All roles will be
automatically applied.

<details>
  <summary>Example</summary>

```hcl
  resource "azurerm_resource_group" "domain_itn_01" {
    name     = "name"
    location = "location"
    tags     = local.tags
  }

  module "repo" {
    source  = "pagopa-dx/azure-github-environment-bootstrap/azurerm"
    version = "~>1.0"

    TBD = [
      azurerm_resource_group.domain_itn_01.id
    ]
  }
```

</details>

### Azure Resources

Understand IAM and assigning the right role in the right way could be difficult.
So, this section shows most common scenarios developers may face.

#### Notes

The label `set by the module` means that the role is already given by the DX
module `azure_github_environment_bootstrap` to Entra ID groups. **Applications
still need a role assignment** (possibly with the narrowest scope).

Code samples should be set next to the resource definition, unless otherwise
specified. The repository can be found in resource tags on Azure Portal.

`Writer` role includes `Reader`, unless otherwise specified.

### Azure APIM

If you get an error about roles while operating on APIM, please add the
`apim_id` optional variable to the `azure_github_environment_bootstrap` by
specifying the APIM instance resource Id.

### Azure Cache for Redis

#### Team-owned Redis

Set by the module

#### Shared Redis

<details>
  <summary>Example</summary>

```hcl
resource "azurerm_role_assignment" "" {
  scope                = <redis-id>
  role_definition_name = "Contributor"
  principal_id         = <who-needs-access>
}
```

</details>

### Azure Cosmos DB

In both scenarios, it is mandatory to manually set IAM roles. This approach is
recommended as keys are not secure.

It is also recommended to set roles at container level rather than Cosmos DB
Account, especially for applications and shared Accounts.

<details>
  <summary>Example</summary>

```hcl
module "" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~>0.0"

  principal_id = <who-needs-access>

  cosmos = [
    {
      account_name = <st-target-name>
      resource_group_name  = <st-target-rg-name>
      role                 = "reader" # or writer
    }
  ]
}
```

Optionally set the database and container via optional variables `database` and
`collections`.

</details>

### Azure Event Hub

#### Team-owned Event Hub

Set by the module

#### Shared Event Hub

<details>
  <summary>Example</summary>

```hcl
module "" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~>0.0"

  principal_id = <who-needs-access>

  event_hub = [
    {
      namespace_name = <st-target-name>
      resource_group_name  = <st-target-rg-name>
      role                 = "reader" # or writer
    }
  ]
}
```

Optionally set the Event Hubs via `event_hub_names` property.

</details>

### Azure Key Vault

#### Team-owned Key Vault

Set by the module if using RBAC access model (recommended).

<details>
  <summary>Enabling RBAC access model to Key Vault</summary>

```hcl
resource "azurerm_key_vault" "" {
  name                = "name"
  location            = "location"
  resource_group_name = "resource-group"

  enable_rbac_authorization = true
}
```

</details>

Otherwise via Access Policies:

<details>
  <summary>Manage Key Vault Access Policies</summary>

```hcl
module "" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~>0.0"

  principal_id = <who-needs-access>

  key_vault = [
    {
      secrets      = "writer" # or writer or owner
      certificates = "writer" # or writer or owner
      keys         = "writer" # or writer or owner
    }
  ]
}
```

</details>

#### Shared Key Vault

<details>
  <summary>Example</summary>

```hcl
module "" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~>0.0"

  principal_id = <who-needs-access>

  key_vault = [
    {
      secrets      = "writer" # or writer or owner
      certificates = "writer" # or writer or owner
      keys         = "writer" # or writer or owner
    }
  ]
}
```

</details>

### Azure NAT Gateway

If you get an error about roles while associating a NAT Gateway to an
AppService/Function App, please add the `nat_gateway_resource_group_id` optional
variable to the `azure_github_environment_bootstrap` by specifying the NAT
Gateways' resource group Id.

### Azure Notification Hub

#### Team-owned Notification Hub

Set by the module

#### Shared Notification Hub

<details>
  <summary>Enable Terraform state access via Entra ID</summary>

```hcl
resource "azurerm_role_assignment" "" {
  scope                = <notification-hub-namespace-id>
  role_definition_name = "Contributor"
  principal_id         = <who-needs-access>
}
```

</details>

### Azure Storage Account

It is recommended to use Entra ID authentication to access Storage Accounts,
instead of using keys. In fact, key-based access ignores IAM roles and can be
used by anyone without further authentication.

To set Entra ID authentication as default and disabling key access, set the
properties TBD of the Storage Account DX module.

<details>
  <summary>Enable Terraform state access via Entra ID</summary>

```hcl
backend "azurerm" {
  ...
  `use_azuread_auth` = true
}
```

</details>

<details>
  <summary>Enable Storage Account access via Entra ID</summary>

```hcl
provider "azurerm" {
  features {}
  storage_use_azuread = true
}

```

</details>

#### Blob

##### Team-owned Storage Account

Set by the module

##### Shared Storage Account

<details>
  <summary>Example</summary>

```hcl
module "" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~>0.0"

  principal_id = <who-needs-access>

  storage_blob = [
    {
      storage_account_name = <st-target-name>
      resource_group_name  = <st-target-rg-name>
      role                 = "reader" # or writer
    }
  ]
}
```

Optionally set the container name via `container_name` property.

</details>

##### Terraform Storage Account

Set by the module

#### Queue

##### Team-owned Storage Account

Set by the module

##### Shared Storage Account

<details>
  <summary>Example</summary>

```hcl
module "" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~>0.0"

  principal_id = <who-needs-access>

  storage_queue = [
    {
      storage_account_name = <st-target-name>
      resource_group_name  = <st-target-rg-name>
      role                 = "reader" # or writer
    }
  ]
}
```

Optionally set the container name via `queue_name` property.

</details>

##### Terraform Storage Account

Set by the module

#### Table

##### Team-owned Storage Account

Set by the module

##### Shared Storage Account

<details>
  <summary>Example</summary>

```hcl
module "" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~>0.0"

  principal_id = <who-needs-access>

  storage_table = [
    {
      storage_account_name = <st-target-name>
      resource_group_name  = <st-target-rg-name>
      role                 = "reader" # or writer
    }
  ]
}

Optionally set the table name via `table_name` property.

```

</details>

##### Terraform Storage Account

Set by the module

## Best Practices

### Role Usage Guidelines

- Follow least-privilege principle
- Add a brief description in the proper field of the role assignment object when
  available
- Use admin privileges only for critical operations

### Security Considerations

- Avoid connection strings; use managed identities where possible
- Remove unused role assignments
